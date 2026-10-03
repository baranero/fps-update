// ─── Kalibracja predykcji na zakończonych zleceniach ─────────────────────────
//
// Log FDS zapisany przy każdym zleceniu zawiera linie „Time Step: N, Simulation
// Time: T s" przeplecione ze znacznikami czasu runnera. Z tego da się odczytać
// dwie rzeczy, których nie sposób wyliczyć z samego pliku wejściowego:
//
//   1. ile kroków na sekundę realnie robi maszyna danego typu (→ przepustowość),
//   2. jaki krok czasowy FDS faktycznie utrzymał (→ prędkość w warunku CFL).
//
// Wynik nadpisuje wartości domyślne w planerze, więc predykcja poprawia się sama
// z każdym kolejnym biegiem — bez ręcznego strojenia stałych.

import { createAdminClient } from "@/lib/supabase/server";
import { FAMILY_PERF, getSpec, perProcThroughput, type ServerFamily, type FamilyPerf } from "@/lib/hetzner/catalog";
import { DEFAULT_CALIBRATION, effectiveProcLoad, type Calibration } from "./planner";
import { fitTimestepModel, predictTimestep, type TimestepSample } from "./timestep";

/** Minimalna liczba biegów danej rodziny, by ufać zmierzonej przepustowości. */
const MIN_SAMPLES_PER_FAMILY = 3;
/** Minimalna liczba biegów, by ruszyć współczynnik prędkości. */
const MIN_SAMPLES_V = 4;
/** Minimalna liczba biegow, by widelki liczyc z danych zamiast z wartosci domyslnych. */
const MIN_SAMPLES_SPREAD = 15;

const CACHE_TTL_MS = 10 * 60 * 1000;

export interface RunMeasurement {
  caseId: string;
  /** Nazwa pliku FDS — po niej rozpoznaje sie zlecenie w diagnostyce. */
  fileName: string | null;
  /** Najwieksze HRRPUA z pliku [kW/m2]; null dla biegow sprzed zapisu tej kolumny. */
  hrrpua: number | null;
  /** Czas symulacji z pliku [s]. */
  tEnd: number | null;
  /** Liczba przeszkod w modelu. */
  obstCount: number | null;
  serverType: string;
  family: ServerFamily;
  cores: number;
  mpiProcs: number;
  meshCount: number | null;
  totalCells: number;
  /** Kroki na sekundę zegara — z regresji na drugiej połowie biegu. */
  stepsPerSec: number;
  /** Średni krok czasowy utrzymany przez FDS [s]. */
  dtMean: number;
  /** cell-timesteps/s na jeden proces MPI. */
  throughput: number;
  /** Osiągnięty czas symulacji [s] i czas zegarowy liczenia [h]. */
  reachedSimTime: number;
  fdsHours: number;
  minCellDim: number | null;
  domainVolume: number | null;
}

interface CachedCalibration {
  calibration: Calibration;
  measurements: RunMeasurement[];
  at: number;
}

let cache: CachedCalibration | null = null;

// ─── Odczyt pomiarów z logu ──────────────────────────────────────────────────

/**
 * Wyciąga z logu przebieg (czas zegarowy → numer kroku). Linie FDS nie mają
 * własnych znaczników czasu, więc bierzemy ostatni znacznik runnera, jaki
 * padł przed daną linią — runner loguje co kilka sekund, więc błąd jest mały
 * wobec godzin liczenia.
 */
export function extractRunCurve(log: string): Array<{ wall: number; step: number; simTime: number }> {
  const pts: Array<{ wall: number; step: number; simTime: number }> = [];
  let clock: number | null = null;
  let start: number | null = null;

  for (const line of log.split("\n")) {
    const ts = line.match(/^\[(\d{2}):(\d{2}):(\d{2})\]/);
    if (ts) {
      let sec = +ts[1] * 3600 + +ts[2] * 60 + +ts[3];
      // Bieg może przekroczyć północ — zegar nie ma prawa cofnąć się o pół doby.
      if (clock !== null && sec < clock - 43_200) sec += 86_400;
      clock = sec;
      if (start === null && /Starting FDS/.test(line)) start = sec;
      continue;
    }
    const st = line.match(/Time Step:\s*(\d+),\s*Simulation Time:\s*([\d.eE+-]+)/);
    if (st && clock !== null && start !== null) {
      pts.push({ wall: clock - start, step: +st[1], simTime: parseFloat(st[2]) });
    }
  }
  return pts;
}

/** Kroki na sekundę — regresja liniowa na drugiej połowie biegu (pomija rozruch). */
function stepsPerSecond(pts: Array<{ wall: number; step: number }>): number | null {
  const half = pts.slice(Math.floor(pts.length / 2));
  if (half.length < 3) return null;

  const n = half.length;
  const sx = half.reduce((a, p) => a + p.wall, 0);
  const sy = half.reduce((a, p) => a + p.step, 0);
  const sxy = half.reduce((a, p) => a + p.wall * p.step, 0);
  const sxx = half.reduce((a, p) => a + p.wall * p.wall, 0);
  const denom = n * sxx - sx * sx;
  if (denom <= 0) return null;

  const slope = (n * sxy - sx * sy) / denom;
  // Ujemne/zerowe nachylenie = log niespójny (restart, obcięcie) — odrzucamy.
  return slope > 0 ? slope : null;
}

function familyOf(serverType: string): ServerFamily | null {
  return getSpec(serverType)?.family ?? null;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[mid - 1] + s[mid]) / 2;
}

// ─── Zbiór pomiarów ──────────────────────────────────────────────────────────

interface SubmissionRow {
  case_id: string;
  server_type: string | null;
  mesh_count: number | null;
  mpi_procs?: number | null;
  total_cells: number | null;
  min_cell_dim?: number | null;
  domain_volume?: number | null;
  fds_log: string | null;
}

const FULL_COLUMNS = "case_id, t_end, obst_count, file_name, hrrpua, server_type, mesh_count, mpi_procs, total_cells, min_cell_dim, domain_volume, fds_log";
/** Bez `hrrpua` — zestaw sprzed migration_hrrpua.sql, ale z pelna geometria. */
const GEOMETRY_COLUMNS = "case_id, t_end, obst_count, file_name, server_type, mesh_count, mpi_procs, total_cells, min_cell_dim, domain_volume, fds_log";
/** Zestaw sprzed migration_server_plan.sql — bez geometrii i liczby procesów. */
const LEGACY_COLUMNS = "case_id, t_end, obst_count, file_name, server_type, mesh_count, total_cells, fds_log";

export async function collectMeasurements(limit = 200): Promise<RunMeasurement[]> {
  const supabase = createAdminClient();

  const query = (columns: string) =>
    supabase
      .from("fds_submissions")
      .select(columns)
      .eq("status", "done")
      .not("fds_log", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

  // Kaskada zestawow kolumn, od najbogatszego. KOLEJNOSC MA ZNACZENIE i kazdy
  // stopien schodzi o JEDNA rzecz: brak swiezo dodanej kolumny nie moze kasowac
  // wszystkich pozostalych.
  //
  // Zdarzylo sie to juz raz: dopisanie `hrrpua` do zestawu pelnego zrzucalo
  // odczyt od razu na LEGACY, czyli bez `min_cell_dim`, `domain_volume`
  // i `mpi_procs`. Model kroku czasowego dostawal wtedy u KAZDEJ probki ten sam,
  // podstawiony rozmiar komorki — i nie mial jak nauczyc sie zaleznosci od
  // rozdzielczosci siatki, czyli od najwazniejszej cechy, jaka ma.
  const brakKolumny = (msg: string) =>
    /column .* does not exist|could not find the .* column/i.test(msg);

  let zestaw = "pelny";
  let { data, error } = await query(FULL_COLUMNS);
  if (error && brakKolumny(error.message)) {
    zestaw = "bez hrrpua";
    ({ data, error } = await query(GEOMETRY_COLUMNS));
  }
  if (error && brakKolumny(error.message)) {
    zestaw = "zapasowy (bez geometrii)";
    ({ data, error } = await query(LEGACY_COLUMNS));
  }
  if (zestaw !== "pelny") {
    console.warn(
      `kalibracja: odczyt na zestawie "${zestaw}" — brakuje kolumn w bazie. ` +
      "Model kroku czasowego uczy sie bez czesci cech; uruchom zalegle migracje."
    );
  }

  if (error || !data) {
    console.error("kalibracja: odczyt historii nieudany:", error?.message);
    return [];
  }

  const out: RunMeasurement[] = [];

  for (const row of data as unknown as SubmissionRow[]) {
    if (!row.fds_log || !row.server_type || !row.total_cells) continue;
    const spec = getSpec(row.server_type);
    const family = familyOf(row.server_type);
    if (!spec || !family) continue;

    const pts = extractRunCurve(row.fds_log);
    if (pts.length < 6) continue;

    const rate = stepsPerSecond(pts);
    if (!rate) continue;

    const last = pts[pts.length - 1];
    if (last.step <= 0 || last.simTime <= 0) continue;

    // Kolumna mpi_procs istnieje dopiero od migracji planera — dla starszych
    // zleceń odtwarzamy ją z reguły „proces na siatkę, nie więcej niż rdzeni".
    const procs = row.mpi_procs ?? Math.min(row.mesh_count ?? 1, spec.cores);
    if (procs < 1) continue;

    out.push({
      caseId: row.case_id,
      fileName: (row as { file_name?: string | null }).file_name ?? null,
      hrrpua: (row as { hrrpua?: number | null }).hrrpua ?? null,
      tEnd: (row as { t_end?: number | null }).t_end ?? null,
      obstCount: (row as { obst_count?: number | null }).obst_count ?? null,
      serverType: row.server_type,
      family,
      cores: spec.cores,
      mpiProcs: procs,
      meshCount: row.mesh_count ?? null,
      totalCells: row.total_cells,
      stepsPerSec: rate,
      dtMean: last.simTime / last.step,
      // Przepustowość liczona na tym samym obciążeniu, którego używa planer
      // (komórki + narzut na siatki). Inaczej bieg z wieloma drobnymi siatkami
      // na procesie zaniżyłby wyuczoną wydajność maszyny — narzut siatek
      // wliczyłby się w sprzęt.
      throughput: rate * effectiveProcLoad(row.total_cells, row.mesh_count ?? procs, procs),
      reachedSimTime: last.simTime,
      fdsHours: last.wall / 3600,
      minCellDim: row.min_cell_dim ?? null,
      domainVolume: row.domain_volume ?? null,
    });
  }

  return out;
}

// ─── Wyprowadzenie kalibracji ────────────────────────────────────────────────

export function deriveCalibration(measurements: RunMeasurement[]): Calibration {
  const perf: Record<ServerFamily, FamilyPerf> = {
    cpx: { ...FAMILY_PERF.cpx },
    cx: { ...FAMILY_PERF.cx },
    ccx: { ...FAMILY_PERF.ccx },
  };

  // Przepustowość rodziny = mediana pomiarów sprowadzonych do jednego procesu.
  // Odwracamy model rywalizacji o pamięć, żeby biegi na różnej liczbie procesów
  // dało się porównywać: throughput(1) = throughput(n) × (1 + c·(n−1)).
  for (const family of Object.keys(perf) as ServerFamily[]) {
    const sub = measurements.filter((m) => m.family === family);
    if (sub.length < MIN_SAMPLES_PER_FAMILY) continue;

    const c = perf[family].contention;
    const singleProc = sub.map((m) => m.throughput * (1 + c * Math.max(0, m.mpiProcs - 1)));
    perf[family] = {
      throughput: Math.round(median(singleProc)),
      contention: c,
      estimated: false,
    };
  }

  // Współczynnik prędkości z realnego kroku czasowego: V = CFL·dx/dt, a modelem
  // jest V = coeff·L^(1/3), więc coeff = V / L^(1/3). Liczymy tylko z biegów,
  // dla których znamy i rozmiar komórki, i objętość domeny.
  const withGeometry = measurements.filter(
    (m) => m.minCellDim && m.minCellDim > 0 && m.domainVolume && m.domainVolume > 0
  );
  let vCoeff = DEFAULT_CALIBRATION.vCoeff;
  if (withGeometry.length >= MIN_SAMPLES_V) {
    const coeffs = withGeometry.map((m) => {
      const vReal = (0.8 * m.minCellDim!) / m.dtMean;   // z warunku CFL
      const L = Math.cbrt(m.domainVolume!);             // charakterystyczny wymiar domeny
      return vReal / Math.cbrt(L);
    });
    vCoeff = median(coeffs);
  }

  // Model kroku czasowego uczony wprost na zmierzonych krokach. Przejmuje
  // prognoze, gdy wypadnie lepiej od wzoru CFL na danych odlozonych — inaczej
  // zostaje CFL ze wspolczynnikiem `vCoeff` wyliczonym wyzej.
  const probki: TimestepSample[] = measurements
    .filter((m) => m.dtMean > 0)
    .map((m) => ({
      minCellDim: m.minCellDim,
      domainVolume: m.domainVolume,
      totalCells: m.totalCells,
      meshCount: m.meshCount ?? 1,
      hrrpua: m.hrrpua ?? null,
      tEnd: m.tEnd,
      obstCount: m.obstCount,
      dt: m.dtMean,
    }));
  const timestep = fitTimestepModel(probki);

  // ── Widelki prognozy ───────────────────────────────────────────────────────
  //
  // Dotad byly zakodowane na sztywno (0,75 ... 1,5) i nie mialy zwiazku z tym,
  // jak model naprawde sie myli. Biegi ladowaly POZA pasmem, ktore mialo je
  // obejmowac — a pasmo jest jedyna informacja, jaka klient dostaje o tym, ile
  // prognoza moze sie rozjechac.
  //
  // Liczymy je teraz z realnych reszt: dla kazdego biegu sprawdzamy, ile razy
  // dluzej (lub krocej) trwal niz mowilby model, i bierzemy 10. i 90. centyl
  // tego rozkladu. Pasmo obejmuje wiec 80% biegow z historii.
  const reszty: number[] = [];
  for (const m of measurements) {
    if (!(m.dtMean > 0) || !(m.fdsHours > 0) || m.mpiProcs < 1) continue;
    const dt = predictTimestep(
      {
        minCellDim: m.minCellDim, domainVolume: m.domainVolume, totalCells: m.totalCells,
        meshCount: m.meshCount ?? 1, hrrpua: m.hrrpua, tEnd: m.tEnd, obstCount: m.obstCount,
      },
      timestep
    );
    if (!(dt > 0)) continue;
    const thr = perProcThroughput(m.family, m.mpiProcs, perf);
    if (!(thr > 0)) continue;
    const load = effectiveProcLoad(m.totalCells, m.meshCount ?? m.mpiProcs, m.mpiProcs);
    const prognoza = ((m.reachedSimTime / dt) * load) / thr / 3600;
    if (prognoza > 0) reszty.push(m.fdsHours / prognoza);
  }

  let spreadLo = DEFAULT_CALIBRATION.spreadLo;
  let spreadHi = DEFAULT_CALIBRATION.spreadHi;
  if (reszty.length >= MIN_SAMPLES_SPREAD) {
    const posort = [...reszty].sort((a, b) => a - b);
    const centyl = (q: number) =>
      posort[Math.min(posort.length - 1, Math.max(0, Math.round(q * (posort.length - 1))))];
    // Pasmo nigdy nie zwezamy ponizej zmierzonego — to byloby udawanie
    // precyzji, ktorej model nie ma.
    spreadLo = Math.min(DEFAULT_CALIBRATION.spreadLo, Math.max(0.1, centyl(0.1)));
    spreadHi = Math.max(DEFAULT_CALIBRATION.spreadHi, Math.min(10, centyl(0.9)));
  }

  return {
    perf,
    vCoeff,
    timestep,
    spreadLo,
    spreadHi,
    samples: measurements.length,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Kalibracja z historii, z 10-minutowym cache w pamięci procesu. Przy błędzie
 * odczytu wraca do wartości domyślnych — wycena nigdy nie może się wywrócić
 * przez niedostępność bazy.
 */
export async function getCalibration(): Promise<Calibration> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.calibration;

  try {
    const measurements = await collectMeasurements();
    const calibration = measurements.length ? deriveCalibration(measurements) : DEFAULT_CALIBRATION;
    cache = { calibration, measurements, at: Date.now() };
    return calibration;
  } catch (err) {
    console.error("kalibracja: nieudana, używam wartości domyślnych:", err);
    return DEFAULT_CALIBRATION;
  }
}

/** Pomiary wraz z kalibracją — do panelu admina (predykcja vs rzeczywistość). */
export async function getCalibrationDetail(): Promise<{ calibration: Calibration; measurements: RunMeasurement[] }> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { calibration: cache.calibration, measurements: cache.measurements };
  }
  const measurements = await collectMeasurements();
  const calibration = measurements.length ? deriveCalibration(measurements) : DEFAULT_CALIBRATION;
  cache = { calibration, measurements, at: Date.now() };
  return { calibration, measurements };
}
