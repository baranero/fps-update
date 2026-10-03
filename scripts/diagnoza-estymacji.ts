// ─── Dlaczego prognoza czasu się nie zgadza ──────────────────────────────────
//
//   npm run diagnoza-estymacji
//   npm run diagnoza-estymacji -- --case=FDS-XXXX-YYYY    (pojedyncze zlecenie)
//
// Prognoza czasu stoi na iloczynie dwóch wielkości:
//
//   czas = kroki × obciążenie procesu ÷ przepustowość
//          \_____/                      \____________/
//        model CFL (dt)                 kalibracja maszyn
//
// Gdy prognoza jest 7× za niska, winna jest jedna z nich albo obie — i bez
// rozłożenia na czynniki nie sposób powiedzieć która. Ten skrypt bierze każdy
// zakończony bieg, czyta z jego logu FDS to, co NAPRAWDĘ się wydarzyło
// (zmierzony krok czasowy i zmierzoną przepustowość), i porównuje z tym, co
// przewidywał model.
//
// Czytelnie: współczynnik > 1 znaczy „model był optymistyczny o tyle razy".
// Iloczyn obu współczynników ≈ całkowite niedoszacowanie czasu.

import { readFileSync } from "node:fs";
import { collectMeasurements, type RunMeasurement } from "@/lib/fds/calibration";
import { effectiveProcLoad, planRuns } from "@/lib/fds/planner";
import { getSpec } from "@/lib/hetzner/catalog";
import { createClient } from "@supabase/supabase-js";
import {
  cflTimestep, fitTimestepModel, predictTimestep, typicalErrorFactor,
  TIMESTEP_TERMS, type TimestepSample,
} from "@/lib/fds/timestep";
import { perProcThroughput } from "@/lib/hetzner/catalog";

// ─── Środowisko ──────────────────────────────────────────────────────────────
//
// collectMeasurements woła createAdminClient(), który czyta process.env — więc
// .env.local musi trafić tam, a nie do lokalnego obiektu.
function zaladujEnv(sciezka = ".env.local"): void {
  let tekst = "";
  try { tekst = readFileSync(sciezka, "utf8"); } catch { return; }
  for (const linia of tekst.split(/\r?\n/)) {
    const m = linia.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
zaladujEnv();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const argv = process.argv.slice(2);
const tylkoCase = argv.find((a) => a.startsWith("--case="))?.split("=")[1] ?? null;

// Echo argumentow: PowerShell potrafi zjesc separator `--` przy `npm run`,
// przez co flaga nigdy nie dolatuje, a raport wyglada jak poprawny przebieg
// zbiorczy. Bez tej linii nie sposob odroznic "nie podano" od "nie dolecialo".
console.log(`argumenty: ${argv.length ? argv.join(" ") : "(brak)"}`);
if (!tylkoCase && argv.some((a) => a.toLowerCase().includes("case"))) {
  console.log("UWAGA: widze slowo 'case' w argumentach, ale --case=... nie zostalo rozpoznane.");
}
if (!tylkoCase) {
  console.log("Pojedyncze zlecenie: npx vite-node --config vitest.config.ts scripts/diagnoza-estymacji.ts --case=NAZWA");
}

// ─── Rozłożenie błędu na czynniki ────────────────────────────────────────────

interface Diagnoza {
  caseId: string;
  fileName: string | null;
  serverType: string;
  procs: number;
  cells: number;
  meshes: number;
  /** Krok czasowy: przewidziany vs zmierzony w logu. */
  dtPred: number;
  dtReal: number;
  /** > 1 = model zakładał ZA DUŻY krok, czyli za mało kroków. */
  wspDt: number;
  /** Przepustowość: przyjęta z kalibracji vs zmierzona. */
  thrPred: number;
  thrReal: number;
  /** > 1 = model zakładał ZA SZYBKĄ maszynę. */
  wspThr: number;
  /** Czas zegarowy: prognoza vs rzeczywistość [h]. */
  godzPred: number;
  godzReal: number;
  /** > 1 = bieg trwał tyle razy dłużej, niż mówiła prognoza. */
  wspCzas: number;
  vEff: number;
  minDx: number | null;
  zrodloDx: "file" | "assumed";
}

function zdiagnozuj(m: RunMeasurement): Diagnoza | null {
  if (!(m.dtMean > 0) || !(m.throughput > 0) || !(m.fdsHours > 0)) return null;

  const cechy = {
    minCellDim: m.minCellDim,
    domainVolume: m.domainVolume,
    totalCells: m.totalCells,
    meshCount: m.meshCount ?? 1,
    hrrpua: m.hrrpua ?? null,
    tEnd: m.tEnd,
    obstCount: m.obstCount,
  };
  const dtCfl = cflTimestep(cechy);
  const ts = { dt: dtCfl, vEff: (0.8 * (m.minCellDim ?? 0.1)) / dtCfl, cellDimSource: m.minCellDim ? "file" as const : "assumed" as const };

  const thrPred = perProcThroughput(m.family, m.mpiProcs);
  const load = effectiveProcLoad(m.totalCells, m.meshCount ?? m.mpiProcs, m.mpiProcs);

  // Prognoza czasu dla TEGO biegu: ten sam czas symulacji, ta sama maszyna,
  // ta sama liczba procesów — różnią się wyłącznie dt i przepustowość.
  const krokiPred = m.reachedSimTime / ts.dt;
  const godzPred = (krokiPred * load) / thrPred / 3600;

  return {
    caseId: m.caseId,
    fileName: m.fileName,
    serverType: m.serverType,
    procs: m.mpiProcs,
    cells: m.totalCells,
    meshes: m.meshCount ?? 0,
    dtPred: ts.dt,
    dtReal: m.dtMean,
    wspDt: ts.dt / m.dtMean,
    thrPred,
    thrReal: m.throughput,
    wspThr: thrPred / m.throughput,
    godzPred,
    godzReal: m.fdsHours,
    wspCzas: m.fdsHours / godzPred,
    vEff: ts.vEff,
    minDx: m.minCellDim,
    zrodloDx: ts.cellDimSource,
  };
}

// ─── Statystyka ──────────────────────────────────────────────────────────────

const mediana = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

const kwantyl = (xs: number[], q: number): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
};

// ─── Przebieg ────────────────────────────────────────────────────────────────

const pomiary = await collectMeasurements(200);
console.log(`\nbiegów z czytelnym logiem: ${pomiary.length}`);

const diagnozy = pomiary.map(zdiagnozuj).filter((d): d is Diagnoza => d !== null);
console.log(`zdiagnozowanych: ${diagnozy.length}`);

if (!diagnozy.length) {
  console.log("Brak danych — logi FDS nie zawierają czytelnego przebiegu kroków.");
  process.exit(0);
}

if (tylkoCase) {
  const szukaj = tylkoCase.toUpperCase();
  const d = diagnozy.find(
    (x) =>
      x.caseId.toUpperCase().includes(szukaj) ||
      (x.fileName ?? "").toUpperCase().includes(szukaj)
  );
  if (!d) {
    console.log(`Nie znalazłem zlecenia pasującego do "${tylkoCase}".`);
    console.log("Dostępne (numer — plik):");
    for (const x of diagnozy.slice(0, 25)) console.log(`  ${x.caseId}  ${x.fileName ?? "—"}`);
    process.exit(1);
  }
  console.log(`\n═══ ${d.caseId} ═══`);
  console.log(`maszyna:            ${d.serverType}, ${d.procs} procesów MPI`);
  console.log(`model:              ${d.cells.toLocaleString("pl-PL")} komórek, ${d.meshes} siatek`);
  console.log(`rozmiar komórki:    ${d.minDx ?? "?"} m (${d.zrodloDx === "file" ? "z pliku" : "ZAŁOŻONY"})`);
  console.log(`prędkość CFL:       ${d.vEff.toFixed(2)} m/s`);
  console.log("");
  console.log(`krok czasowy:       prognoza ${d.dtPred.toExponential(3)} s  ·  realny ${d.dtReal.toExponential(3)} s`);
  console.log(`                    → model zakładał krok ${d.wspDt.toFixed(2)}× za duży`);
  console.log(`przepustowość:      prognoza ${Math.round(d.thrPred).toLocaleString("pl-PL")}  ·  realna ${Math.round(d.thrReal).toLocaleString("pl-PL")} cell-ts/s`);
  console.log(`                    → model zakładał maszynę ${d.wspThr.toFixed(2)}× za szybką`);
  console.log("");
  console.log(`czas:               prognoza ${d.godzPred.toFixed(1)} h  ·  realny ${d.godzReal.toFixed(1)} h`);
  console.log(`                    → bieg trwał ${d.wspCzas.toFixed(2)}× dłużej`);
  console.log("");
  console.log(`rozklad winy:       krok czasowy ${d.wspDt.toFixed(2)}× · przepustowosc ${d.wspThr.toFixed(2)}× = ${(d.wspDt * d.wspThr).toFixed(2)}×`);
  console.log("");

  // ── Rozklad wyceny ─────────────────────────────────────────────────────────
  //
  // Prognoza czasu to tylko jeden z czynnikow ceny. Drugim jest DOBOR MASZYNY:
  // kafel kompromisowy potrafi wskazac maszyne dedykowana, ponad dwa razy
  // drozsza za godzine od wspoldzielonej, na ktorej zlecenie faktycznie
  // pojechalo. Bez rozbicia obu czynnikow nie da sie powiedziec, skad roznica.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: wiersz } = await db
    .from("fds_submissions")
    .select("price, price_old, server_type, mesh_count, total_cells, t_end, min_cell_dim, domain_volume, hrrpua, dispatched_at, completed_at")
    .eq("case_id", d.caseId)
    .maybeSingle();

  if (wiersz) {
    const r = wiersz as Record<string, number | string | null>;
    const meshes = Math.max(1, Number(r.mesh_count ?? 1));
    const cells = Number(r.total_cells ?? 0);

    // Podzialu siatek nie przechowujemy — do porownania wystarczy rowny.
    const plan = planRuns({
      meshCount: meshes,
      meshCells: new Array(meshes).fill(cells / meshes),
      totalCells: cells,
      tEnd: r.t_end === null ? null : Number(r.t_end),
      minCellDim: r.min_cell_dim === null ? null : Number(r.min_cell_dim),
      domainVolume: r.domain_volume === null ? null : Number(r.domain_volume),
      hrrpua: r.hrrpua === null ? null : Number(r.hrrpua),
      ompThreads: 1,
      forcedProcs: null,
    });

    const specReal = getSpec(String(r.server_type ?? ""));
    console.log("");
    console.log("── wycena ──");
    console.log(`  faktycznie:  ${String(r.server_type)} (${specReal ? specReal.eurPerHour.toFixed(4) : "?"} €/h, ${specReal?.dedicated ? "dedykowana" : "wspoldzielona"})  ${d.godzReal.toFixed(1)} h  ${Number(r.price ?? 0).toFixed(2)} zl`);
    if (r.price_old !== null) console.log(`               (cena sprzed przeliczenia cennika: ${Number(r.price_old).toFixed(2)} zl)`);

    for (const [nazwa, wariant] of [["eco", plan.eco], ["kompromis", plan.balanced], ["fast", plan.fast]] as const) {
      if (!wariant) continue;
      const spec = getSpec(wariant.serverType);
      const znacznik = wariant.serverType === r.server_type ? "  <- ta sama maszyna" : "";
      console.log(
        `  ${nazwa.padEnd(11)}${wariant.serverType} (${spec ? spec.eurPerHour.toFixed(4) : "?"} €/h, ${spec?.dedicated ? "dedykowana" : "wspoldzielona"})  ` +
        `${wariant.wallHours.toFixed(1)} h  ${wariant.price.toFixed(2)} zl${znacznik}`
      );
    }

    // Rozklad roznicy na kafel kompromisowy — to on jest domyslnie zaznaczony.
    const b = plan.balanced;
    if (b && specReal && Number(r.price ?? 0) > 0) {
      const specB = getSpec(b.serverType);
      const wspStawka = specB && specReal.eurPerHour > 0 ? specB.eurPerHour / specReal.eurPerHour : 1;
      const wspGodzin = d.godzReal > 0 ? b.wallHours / d.godzReal : 1;
      const wspCeny = b.price / Number(r.price);
      console.log("");
      console.log(`  rozklad roznicy ceny (kompromis vs faktyczna):`);
      console.log(`    stawka maszyny:  ${wspStawka.toFixed(2)}×`);
      console.log(`    czas:            ${wspGodzin.toFixed(2)}×`);
      console.log(`    razem cena:      ${wspCeny.toFixed(2)}×  (iloczyn wyzej: ${(wspStawka * wspGodzin).toFixed(2)}×, reszta to magazyn i progresja marzy)`);
    }
  }

  process.exit(0);
}

// ─── Czy nowy model kroku czasowego pomaga ───────────────────────────────────

const probki: TimestepSample[] = pomiary
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

const model = fitTimestepModel(probki);
const realDt = probki.map((s) => s.dt);

console.log("");
console.log("── model kroku czasowego ──");
console.log(`  biegow do nauki:        ${model.samples}`);
console.log(`  z zapisanym HRRPUA:     ${probki.filter((s) => s.hrrpua !== null).length}`);
console.log(`  wzor CFL myli sie o:    ${model.cflFactor.toFixed(2)}×`);
if (model.kind === "learned") {
  console.log(`  model wyuczony myli sie:${model.typicalFactor.toFixed(2)}×  (walidacja krzyzowa)`);
  console.log(`  poprawa:                ${(model.cflFactor / model.typicalFactor).toFixed(2)}×`);
  console.log("  wspolczynniki:");
  model.coef.forEach((c, i) => {
    console.log(`    ${(TIMESTEP_TERMS[i] ?? "?").padEnd(22)}${c >= 0 ? " " : ""}${c.toFixed(4)}`);
  });
  const wUczony = typicalErrorFactor(probki.map((s) => predictTimestep(s, model)), realDt);
  console.log(`  (dopasowanie do danych uczacych: ${wUczony.toFixed(2)}× — nizsze, bo to nie jest uczciwa miara)`);
} else {
  console.log("  model wyuczony NIE zostal przyjety — nie pobil wzoru na danych odlozonych.");
  console.log("  Powod: za malo biegow albo cechy nie tlumacza kroku czasowego.");
}

// ── Czas liczenia wg modelu, ktorego uzywa planer ──────────────────────────
//
// Sekcje nizej opisuja wzor ZAPASOWY (CFL). Skoro planer siega po model
// wyuczony, to jego blad jest tym, co klient naprawde zobaczy — i on musi byc
// w raporcie, inaczej ocenialibysmy kod, ktory nie dziala w produkcji.
if (model.kind === "learned") {
  const bledyModelu = pomiary
    .map((m) => {
      const d = diagnozy.find((x) => x.caseId === m.caseId);
      if (!d || !(m.dtMean > 0)) return null;
      const cechy = {
        minCellDim: m.minCellDim, domainVolume: m.domainVolume, totalCells: m.totalCells,
        meshCount: m.meshCount ?? 1, hrrpua: m.hrrpua ?? null, tEnd: m.tEnd, obstCount: m.obstCount,
      };
      const kroki = m.reachedSimTime / predictTimestep(cechy, model);
      const godz = (kroki * effectiveProcLoad(m.totalCells, m.meshCount ?? m.mpiProcs, m.mpiProcs)) / d.thrPred / 3600;
      return godz > 0 ? m.fdsHours / godz : null;
    })
    .filter((x): x is number => x !== null);

  console.log("");
  console.log("── czas liczenia wg modelu wyuczonego (to widzi klient) ──");
  console.log(`  mediana:  ${mediana(bledyModelu).toFixed(2)}×   (1,00 = idealnie)`);
  console.log(`  10%-90%:  ${kwantyl(bledyModelu, 0.1).toFixed(2)}× ... ${kwantyl(bledyModelu, 0.9).toFixed(2)}×`);
  console.log(`  dluzszych niz prognoza: ${bledyModelu.filter((x) => x > 1).length} / ${bledyModelu.length}`);
  console.log("  (ponizej: te same liczby dla wzoru ZAPASOWEGO, dla porownania)");

  // Pasmo, ktore zobaczy klient, musi obejmowac to, co sie realnie dzieje.
  const wPasmie = bledyModelu.filter((x) => x >= kwantyl(bledyModelu, 0.1) && x <= kwantyl(bledyModelu, 0.9)).length;
  console.log(`  proponowane widelki z danych: ${kwantyl(bledyModelu, 0.1).toFixed(2)}× ... ${kwantyl(bledyModelu, 0.9).toFixed(2)}×`);
  console.log(`  obejma ${wPasmie} / ${bledyModelu.length} biegow (celowo 80%)`);
  console.log("  UWAGA na watchdoga: ubija bieg przy 3x prognozy — sprawdz margines wzgledem gornej krawedzi.");
}

const wspCzas = diagnozy.map((d) => d.wspCzas);
const wspDt = diagnozy.map((d) => d.wspDt);
const wspThr = diagnozy.map((d) => d.wspThr);

console.log("\n— całkowity błąd prognozy czasu (realny ÷ prognoza) —");
console.log(`  mediana:  ${mediana(wspCzas).toFixed(2)}×`);
console.log(`  10%–90%:  ${kwantyl(wspCzas, 0.1).toFixed(2)}× … ${kwantyl(wspCzas, 0.9).toFixed(2)}×`);
console.log(`  najgorszy:${Math.max(...wspCzas).toFixed(2)}×`);
console.log(`  biegów dłuższych niż prognoza: ${wspCzas.filter((x) => x > 1).length} / ${wspCzas.length}`);

console.log("\n— rozkład winy (mediana) —");
console.log(`  krok czasowy za duży o:   ${mediana(wspDt).toFixed(2)}×`);
console.log(`  maszyna za szybka o:      ${mediana(wspThr).toFixed(2)}×`);
console.log(`  iloczyn:                  ${(mediana(wspDt) * mediana(wspThr)).toFixed(2)}×`);
console.log("  (iloczyn powinien być bliski medianie błędu całkowitego powyżej)");

const zPliku = diagnozy.filter((d) => d.zrodloDx === "file");
const zalozone = diagnozy.filter((d) => d.zrodloDx === "assumed");
console.log("\n— czy rozmiar komórki pochodził z pliku —");
console.log(`  z pliku (${String(zPliku.length).padStart(3)}):   mediana błędu ${mediana(zPliku.map((d) => d.wspCzas)).toFixed(2)}×`);
console.log(`  założony (${String(zalozone.length).padStart(3)}): mediana błędu ${mediana(zalozone.map((d) => d.wspCzas)).toFixed(2)}×`);

console.log("\n— 15 najgorzej oszacowanych —");
console.log("zlecenie              maszyna  proc     komórek   progn.h   real.h   błąd   dt×   thr×   plik");
for (const d of [...diagnozy].sort((a, b) => b.wspCzas - a.wspCzas).slice(0, 15)) {
  console.log(
    `${d.caseId.padEnd(22)}${(d.serverType ?? "?").padEnd(8)}${String(d.procs).padStart(4)}  ` +
    `${d.cells.toLocaleString("pl-PL").padStart(11)}  ${d.godzPred.toFixed(1).padStart(7)}  ` +
    `${d.godzReal.toFixed(1).padStart(7)}  ${d.wspCzas.toFixed(1).padStart(5)}× ` +
    `${d.wspDt.toFixed(1).padStart(5)} ${d.wspThr.toFixed(1).padStart(5)}   ${(d.fileName ?? "").slice(0, 30)}`
  );
}
