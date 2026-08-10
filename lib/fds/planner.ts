// ─── Planer maszyn obliczeniowych ────────────────────────────────────────────
//
// Dla sparsowanego modelu buduje komplet wykonalnych konfiguracji sprzętowych,
// wycenia każdą i zostawia tylko te, których nic nie bije jednocześnie na czasie
// i na cenie (front Pareto). Dzięki temu klient dostaje realny wybór „taniej,
// ale dłużej ↔ drożej, ale szybciej", a nie listę wariantów, z których połowa
// jest gorsza pod każdym względem.
//
// Kluczowa własność FDS, na której stoi tryb ekonomiczny: liczba procesów MPI
// NIE musi równać się liczbie siatek. Gdy procesów jest mniej, FDS rozdziela
// siatki między nie (o ile plik nie przypisuje ich sztywno przez MPI_PROCESS).
// 48 siatek policzy się więc na 16 rdzeniach — po 3 siatki na proces, ~3× dłużej,
// ale na maszynie 6× tańszej.

import {
  SERVER_CATALOG,
  getSpec,
  FAMILY_PERF,
  type FamilyPerf,
  type ServerFamily,
  type ServerSpec,
} from "@/lib/hetzner/catalog";
import { OVERHEAD_H, STORAGE_EUR_PER_GB, estimateOutputGb, priceFromCost } from "./pricing";
import { meshLoadFor } from "./mpi";

// ─── Stałe modelu fizycznego ─────────────────────────────────────────────────

const CFL_FACTOR = 0.8;   // współczynnik CFL (domyślny w FDS)
const DEFAULT_DX = 0.10;  // m — zakładany rozmiar komórki, gdy plik nie podaje XB
const DT_MAX = 0.5;       // s — górne ograniczenie kroku
const DT_MIN = 0.001;     // s — dolne ograniczenie kroku

// Prędkość charakterystyczna w warunku CFL (dt = CFL·dx/V).
//
// Nie jest stała — rośnie ze skalą modelu. Pióropusz pożaru rozpędza się na
// długości, więc w hali maksymalne prędkości są wyraźnie wyższe niż w małym
// pomieszczeniu przy tym samym pożarze. Teoria pióropusza daje u ~ z^(1/3),
// co potwierdzają biegi FDSRun (L = charakterystyczny wymiar domeny = ∛objętość):
//
//   L = 2,5 m  (16 tys. komórek)   → V_real = 5,6 … 5,9 m/s
//   L = 11,4 m (1,49 mln komórek)  → V_real = 10,1 … 13,3 m/s
//
//   V = V_COEFF · L^(1/3)  odtwarza te pomiary z błędem ±5% dla 9 z 11 biegów,
//   przy 93-krotnej rozpiętości objętości domeny.
const V_COEFF = 4.3;
const V_EFF_MIN = 4;
const V_EFF_MAX = 20;

/** Prędkość charakterystyczna [m/s] z objętości domeny [m³]. */
export function effectiveVelocity(domainVolumeM3: number, coeff = V_COEFF): number {
  const L = Math.cbrt(Math.max(1e-6, domainVolumeM3));
  return Math.min(V_EFF_MAX, Math.max(V_EFF_MIN, coeff * Math.cbrt(L)));
}

// Stały narzut na każdą siatkę obsługiwaną przez proces, wyrażony w
// „komórkach-równoważnikach" doliczanych do obciążenia w każdym kroku:
// wymiana warstw brzegowych i obsługa siatki kosztują niezależnie od tego,
// jak siatka jest mała.
//
// Wyznaczony z dwóch skrajnych biegów FDSRun:
//   1 siatka/proces, 93 tys. komórek  → wpływ +1%   (prognoza bez zmian)
//   12 siatek/proces, po 333 komórki  → wpływ ×4    (bez tego składnika
//                                        prognoza była 3,9× zbyt optymistyczna)
// Przy realnych modelach (dziesiątki tysięcy komórek na siatkę) to poprawka
// rzędu procentów; ratuje wycenę dopiero przy modelach pociętych na drobno.
export const MESH_OVERHEAD_CELLS = 1000;

/** Obciążenie procesu w komórkach-równoważnikach: komórki + narzut na siatki. */
export function effectiveProcLoad(cells: number, meshes: number, procs: number): number {
  if (procs <= 0) return cells;
  return cells / procs + MESH_OVERHEAD_CELLS * (meshes / procs);
}

// Pamięć: baza na system i FDS + zapotrzebowanie proporcjonalne do komórek.
const RAM_BASE_GB = 2;
const RAM_GB_PER_MCELL = 1.5;

// Dysk: wyniki + margines na pliki tymczasowe FDS.
const DISK_BASE_GB = 15;

/** Powyżej tego czasu wariant nie trafia do kafli — zostaje tylko na pełnej liście. */
const DEFAULT_MAX_WALL_HOURS = 96;

// ─── Typy ────────────────────────────────────────────────────────────────────

export interface PlanInput {
  meshCount: number;
  /** Komórki w poszczególnych siatkach — potrzebne do oceny balansu obciążenia. */
  meshCells: number[];
  totalCells: number;
  tEnd: number | null;
  minCellDim: number | null;
  /** Objętość domeny [m³] — suma objętości siatek. Steruje prędkością w warunku CFL. */
  domainVolume: number | null;
  ompThreads: number;
  /** Gdy plik sztywno przypisuje siatki do procesów (MPI_PROCESS), liczba procesów jest narzucona. */
  forcedProcs: number | null;
}

export type PlanTier = "eco" | "balanced" | "fast";

export type PlanWarning =
  | "unbalanced"    // siatki różnej wielkości — część procesów czeka na najwolniejszy
  | "tooSlow"       // czas przekracza rozsądny próg
  | "tightRam"      // pamięć wystarcza, ale bez zapasu
  | "sharedCpu"     // współdzielone rdzenie — czas może się wahać
  | "unvalidated";  // brak własnych pomiarów wydajności dla tej rodziny maszyn

export interface RunPlan {
  serverType: string;
  family: ServerFamily;
  cores: number;
  ramGb: number;
  dedicated: boolean;

  mpiProcs: number;
  ompThreads: number;
  /** Najwięcej siatek przypadających na jeden proces — to on wyznacza czas. */
  meshesPerProc: number;
  /** Komórki na najbardziej obciążonym procesie (po rozdzieleniu siatek). */
  maxLoadCells: number;
  /** 1.0 = idealny balans; 0.7 = najwolniejszy proces ma 30% pracy więcej niż średnia. */
  balance: number;

  wallHours: number;
  wallLoHours: number;
  wallHiHours: number;
  billedHours: number;

  cloudCostEur: number;
  storageCostEur: number;
  estimatedOutputGb: number;
  price: number;

  tier: PlanTier | null;
  warnings: PlanWarning[];
}

export interface Calibration {
  perf: Record<ServerFamily, FamilyPerf>;
  /** Współczynnik w prawie V = coeff · L^(1/3). */
  vCoeff: number;
  /** Mnożniki czasu wyznaczające widełki (dolna/górna krawędź względem mediany). */
  spreadLo: number;
  spreadHi: number;
  samples: number;
  updatedAt: string | null;
}

export const DEFAULT_CALIBRATION: Calibration = {
  perf: FAMILY_PERF,
  vCoeff: V_COEFF,
  // Rozrzut reszt modelu na biegach FDSRun (n=11): 0,78 … 1,49 przy medianie
  // 0,96. Widełki celowo trochę szersze niż zmierzony zakres — współdzielone
  // rdzenie potrafią zwolnić bardziej, niż widzieliśmy do tej pory.
  spreadLo: 0.75,
  spreadHi: 1.5,
  samples: 0,
  updatedAt: null,
};

export interface PlannerOptions {
  /** Typy faktycznie dostępne u dostawcy; null = nie sprawdzamy (katalog statyczny). */
  availableTypes?: string[] | null;
  /** Żywe stawki €/h z API — nadpisują cennik z katalogu. */
  prices?: Record<string, number> | null;
  calibration?: Calibration;
  maxWallHours?: number;
}

export interface PlanResult {
  plans: RunPlan[];
  eco: RunPlan | null;
  balanced: RunPlan | null;
  fast: RunPlan | null;
  dtEstimate: number;
  steps: number;
  /** Prędkość charakterystyczna użyta w warunku CFL [m/s] — do wglądu w adminie. */
  vEff: number;
  domainVolume: number;
  cellDimSource: "file" | "assumed";
  calibration: Calibration;
  /** Kod powodu, gdy nie da się zbudować żadnego wariantu. */
  blocked: "noServer" | "ramTooSmall" | "forcedProcs" | null;
}

// ─── Rozdział siatek między procesy ──────────────────────────────────────────
//
// Liczony w lib/fds/mpi.ts, bo ten sam podział trafia potem do pliku jako
// MPI_PROCESS. Prognoza opisuje więc dokładnie ten układ, który pojedzie.
export { meshLoadFor as maxProcLoad } from "./mpi";

// ─── Budowa i wycena pojedynczego wariantu ───────────────────────────────────

function buildPlan(
  spec: ServerSpec,
  input: PlanInput,
  ctx: { steps: number; cells: number; tEnd: number; cal: Calibration; maxWallHours: number; eurPerHour: number }
): RunPlan | null {
  const omp = Math.max(1, input.ompThreads);

  // Ile procesów MPI zmieści się na tej maszynie i ile ma sens odpalić.
  let procs = Math.min(input.meshCount, Math.floor(spec.cores / omp));
  if (input.forcedProcs != null) {
    // Plik przypisuje siatki do procesów sztywno — liczby nie wolno zmieniać.
    if (input.forcedProcs * omp > spec.cores) return null;
    procs = input.forcedProcs;
  }
  if (procs < 1) return null;

  // Pamięć i dysk
  const ramNeededGb = RAM_BASE_GB + (ctx.cells / 1_000_000) * RAM_GB_PER_MCELL;
  if (ramNeededGb > spec.ramGb) return null;

  const outputGb = estimateOutputGb(ctx.cells, ctx.tEnd);
  if (DISK_BASE_GB + outputGb * 2 > spec.diskGb) return null;

  // Czas: kroki × obciążenie procesu / wydajność procesu.
  //
  // Obciążeniem jest ŚREDNIA liczba komórek na proces, nie maksymalna — bo
  // przepustowość w kalibracji jest mierzona dokładnie tak samo (kroki na
  // sekundę × komórki / procesy). Gdyby planer wstawił tu maksimum, nierówny
  // podział siatek policzyłby się dwa razy: raz w zmierzonej przepustowości,
  // drugi raz w obciążeniu. Nierównomierność wchodzi więc wyłącznie do górnej
  // krawędzi widełek (niżej) i do ostrzeżenia.
  const { maxLoad, maxMeshes } = meshLoadFor(
    input.meshCells.length ? input.meshCells : [ctx.cells],
    procs
  );
  const avgLoad = ctx.cells / procs;
  const imbalance = avgLoad > 0 ? Math.max(1, maxLoad / avgLoad) : 1;

  // Do obciążenia dochodzi stały koszt obsługi każdej siatki na procesie.
  const effectiveLoad = effectiveProcLoad(ctx.cells, input.meshCount, procs);

  const perf = ctx.cal.perf[spec.family];
  const perProc = perf.throughput / (1 + perf.contention * Math.max(0, procs - 1));
  const wallHours = Math.max(1 / 60, (ctx.steps * effectiveLoad) / perProc / 3600);
  const billedHours = wallHours + OVERHEAD_H;

  // Koszt
  const cloudCostEur = billedHours * ctx.eurPerHour;
  const storageCostEur = outputGb * STORAGE_EUR_PER_GB;

  // Balans: ile pracy ma najwolniejszy proces względem idealnego podziału
  const balance = maxLoad > 0 ? avgLoad / maxLoad : 1;

  const warnings: PlanWarning[] = [];
  if (balance < 0.85) warnings.push("unbalanced");
  if (wallHours > ctx.maxWallHours) warnings.push("tooSlow");
  if (ramNeededGb > spec.ramGb * 0.75) warnings.push("tightRam");
  if (!spec.dedicated) warnings.push("sharedCpu");
  if (perf.estimated) warnings.push("unvalidated");

  return {
    serverType: spec.type,
    family: spec.family,
    cores: spec.cores,
    ramGb: spec.ramGb,
    dedicated: spec.dedicated,
    mpiProcs: procs,
    ompThreads: omp,
    meshesPerProc: maxMeshes,
    maxLoadCells: maxLoad,
    balance,
    wallHours,
    wallLoHours: wallHours * ctx.cal.spreadLo,
    // Nierówny podział siatek nie zmienia wartości oczekiwanej, ale realnie może
    // wydłużyć bieg — dlatego rozpycha wyłącznie górną krawędź widełek.
    wallHiHours: wallHours * ctx.cal.spreadHi * imbalance,
    billedHours,
    cloudCostEur,
    storageCostEur,
    estimatedOutputGb: outputGb,
    price: priceFromCost(cloudCostEur, storageCostEur),
    tier: null,
    warnings,
  };
}

// ─── Front Pareto ────────────────────────────────────────────────────────────
//
// Wariant wypada, jeśli inny jest jednocześnie nie wolniejszy i nie droższy.
// Zostaje wyłącznie realny wybór: każdy pozostały jest w czymś najlepszy.
function paretoFront(plans: RunPlan[]): RunPlan[] {
  return plans.filter((a, i) =>
    !plans.some((b, j) =>
      j !== i &&
      b.wallHours <= a.wallHours &&
      b.price <= a.price &&
      // przy pełnym remisie zostaw ten pierwszy, żeby nie wyciąć obu
      (b.wallHours < a.wallHours || b.price < a.price || j < i)
    )
  );
}

// ─── Główna funkcja ──────────────────────────────────────────────────────────

export function planRuns(input: PlanInput, opts: PlannerOptions = {}): PlanResult {
  const cal = opts.calibration ?? DEFAULT_CALIBRATION;
  const maxWallHours = opts.maxWallHours ?? DEFAULT_MAX_WALL_HOURS;

  const cells = Math.max(1, input.totalCells);
  const tEnd = input.tEnd && input.tEnd > 0 ? input.tEnd : 300;

  // Krok czasowy z warunku CFL, z prędkością zależną od skali modelu.
  // Gdy plik nie podaje XB, objętość szacujemy z liczby komórek i założonego dx.
  const cellDimSource: "file" | "assumed" = input.minCellDim ? "file" : "assumed";
  const minDx = input.minCellDim ?? DEFAULT_DX;
  const volume = input.domainVolume && input.domainVolume > 0 ? input.domainVolume : cells * minDx ** 3;
  const vEff = effectiveVelocity(volume, cal.vCoeff);
  const dtEstimate = Math.max(DT_MIN, Math.min((CFL_FACTOR * minDx) / vEff, DT_MAX));
  const steps = tEnd / dtEstimate;

  const available = opts.availableTypes ? new Set(opts.availableTypes) : null;

  const candidates = SERVER_CATALOG.filter((s) => !available || available.has(s.type));

  const all: RunPlan[] = [];
  for (const spec of candidates) {
    const plan = buildPlan(spec, input, {
      steps,
      cells,
      tEnd,
      cal,
      maxWallHours,
      eurPerHour: opts.prices?.[spec.type] ?? spec.eurPerHour,
    });
    if (plan) all.push(plan);
  }

  const base: Omit<PlanResult, "plans" | "eco" | "balanced" | "fast"> = {
    dtEstimate,
    steps,
    vEff,
    domainVolume: volume,
    cellDimSource,
    calibration: cal,
    blocked: null,
  };

  if (all.length === 0) {
    // Rozróżniamy powód, żeby komunikat dla klienta był konkretny.
    const ramNeeded = RAM_BASE_GB + (cells / 1_000_000) * RAM_GB_PER_MCELL;
    const maxRam = Math.max(...candidates.map((s) => s.ramGb), 0);
    const maxCores = Math.max(...candidates.map((s) => s.cores), 0);
    const blocked: PlanResult["blocked"] =
      candidates.length === 0 ? "noServer"
      : ramNeeded > maxRam ? "ramTooSmall"
      : input.forcedProcs != null && input.forcedProcs * Math.max(1, input.ompThreads) > maxCores ? "forcedProcs"
      : "noServer";
    return { ...base, plans: [], eco: null, balanced: null, fast: null, blocked };
  }

  const plans = paretoFront(all).sort((a, b) => a.price - b.price);

  // Kafle: najtańszy, najszybszy i najlepszy kompromis. Kompromis liczymy jako
  // minimum sumy znormalizowanej ceny i czasu — wariant najbliższy ideałowi
  // „najtaniej i najszybciej naraz", którego nigdy nie ma.
  const usable = plans.filter((p) => !p.warnings.includes("tooSlow"));
  const pool = usable.length ? usable : plans;

  const minPrice = Math.min(...pool.map((p) => p.price));
  const minWall = Math.min(...pool.map((p) => p.wallHours));

  const eco = pool.reduce((a, b) => (b.price < a.price || (b.price === a.price && b.wallHours < a.wallHours) ? b : a));
  const fast = pool.reduce((a, b) => (b.wallHours < a.wallHours || (b.wallHours === a.wallHours && b.price < a.price) ? b : a));
  const score = (p: RunPlan) => p.price / minPrice + p.wallHours / minWall;
  const balanced = pool.reduce((a, b) => (score(b) < score(a) ? b : a));

  eco.tier = "eco";
  fast.tier = "fast";
  // Kolejność przypisań ma znaczenie: gdy kompromis pokrywa się z krańcem,
  // niech zostanie oznaczony jako kompromis — to on jest domyślnie zaznaczony.
  balanced.tier = "balanced";

  return { ...base, plans, eco, balanced, fast, blocked: null };
}

/** Wydajność jednego procesu MPI wg konkretnej kalibracji — używa panel admina. */
export function perProcThroughputFor(cal: Calibration, family: ServerFamily, procs: number): number {
  const p = cal.perf[family];
  return p.throughput / (1 + p.contention * Math.max(0, procs - 1));
}

/** Wariant po typie maszyny — do walidacji wyboru klienta po stronie serwera. */
export function findPlan(result: PlanResult, serverType: string | null): RunPlan | null {
  if (!serverType) return null;
  return result.plans.find((p) => p.serverType === serverType.toLowerCase()) ?? null;
}

export { getSpec };
