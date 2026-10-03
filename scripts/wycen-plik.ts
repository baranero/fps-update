// ─── Co planer mówi o konkretnym pliku .fds ──────────────────────────────────
//
//   npx vite-node --config vitest.config.ts scripts/wycen-plik.ts --plik=sciezka/model.fds
//
// Odtwarza dokładnie to, co widzi klient w kreatorze — ale z rozpisaniem, skąd
// każda liczba się bierze. Gdy wycena wygląda absurdalnie, tu widać dlaczego:
// która cecha wypadła poza zakres, czy zadziałał model wyuczony czy wzór
// zapasowy, i jak daleko prognoza odbiega od warunku CFL.
//
// Nie dotyka bazy zleceń poza pobraniem kalibracji — można puszczać na dowolnym
// pliku, także takim, który nigdy nie był policzony.

import { readFileSync } from "node:fs";
import { parseFds, toPlanInput } from "@/lib/fds/parser";
import { planRuns, type Calibration } from "@/lib/fds/planner";
import { DEFAULT_CALIBRATION } from "@/lib/fds/planner";
import {
  TIMESTEP_TERMS, cflTimestep, featureVector, predictTimestep,
  type TimestepFeatures,
} from "@/lib/fds/timestep";
import { getSpec } from "@/lib/hetzner/catalog";

function zaladujEnv(sciezka = ".env.local"): void {
  let tekst = "";
  try { tekst = readFileSync(sciezka, "utf8"); } catch { return; }
  for (const linia of tekst.split(/\r?\n/)) {
    const m = linia.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
zaladujEnv();

const argv = process.argv.slice(2);
const plik = argv.find((a) => a.startsWith("--plik="))?.split("=").slice(1).join("=");
const bezKalibracji = argv.includes("--bez-kalibracji");

console.log(`argumenty: ${argv.length ? argv.join(" ") : "(brak)"}`);
if (!plik) {
  console.error("\nPodaj plik: --plik=sciezka/do/modelu.fds");
  console.error("Opcjonalnie --bez-kalibracji, zeby zobaczyc sam wzor zapasowy.");
  process.exit(1);
}

let tresc = "";
try {
  tresc = readFileSync(plik, "utf8");
} catch (e) {
  console.error(`Nie moge odczytac pliku: ${(e as Error).message}`);
  process.exit(1);
}

// ─── Analiza pliku ───────────────────────────────────────────────────────────

const parsed = parseFds(tresc);
if (!parsed.valid) {
  console.error(`\nPlik nie przeszedl analizy: ${parsed.error ?? "nieznany powod"}`);
  process.exit(1);
}

const input = toPlanInput(parsed);

console.log(`\n═══ ${plik} ═══`);
console.log(`CHID:               ${parsed.chid ?? "—"}`);
console.log(`siatki:             ${parsed.meshCount}`);
console.log(`komórki:            ${parsed.totalCells.toLocaleString("pl-PL")}`);
console.log(`czas symulacji:     ${parsed.tEnd ?? "—"} s`);
console.log(`min. komórka:       ${parsed.minCellDim ?? "BRAK W PLIKU (podstawiane 0,1 m)"}`);
console.log(`objętość domeny:    ${parsed.domainVolume ? parsed.domainVolume.toFixed(0) + " m³" : "—"}`);
console.log(`HRRPUA (max):       ${parsed.hrrpua ?? "BRAK — plik nie deklaruje palącego się SURF"}`);
console.log(`przeszkody:         ${parsed.obstCount}`);
console.log(`MPI_PROCESS w pliku:${parsed.forcedProcs ?? " nie"}`);

// ─── Kalibracja ──────────────────────────────────────────────────────────────

let cal: Calibration = DEFAULT_CALIBRATION;
if (!bezKalibracji && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { getCalibration } = await import("@/lib/fds/calibration");
  cal = await getCalibration();
}

const cechy: TimestepFeatures = {
  minCellDim: parsed.minCellDim,
  domainVolume: parsed.domainVolume,
  totalCells: parsed.totalCells,
  meshCount: parsed.meshCount,
  hrrpua: parsed.hrrpua,
  tEnd: parsed.tEnd,
  obstCount: parsed.obstCount,
};

const dtWzor = cflTimestep(cechy, cal.vCoeff);
const dtUzyty = predictTimestep(cechy, cal.timestep);
const wyuczony = cal.timestep.kind === "learned";
const uzytoWyuczonego = wyuczony && dtUzyty !== cflTimestep(cechy);

console.log(`\n── krok czasowy ──`);
console.log(`model w kalibracji: ${wyuczony ? `wyuczony (${cal.timestep.samples} biegów, myli sie ${cal.timestep.typicalFactor.toFixed(2)}×)` : "wzór CFL (brak wyuczonego)"}`);
console.log(`wzór CFL:           ${dtWzor.toExponential(3)} s`);
console.log(`użyty:              ${dtUzyty.toExponential(3)} s  ${uzytoWyuczonego ? "(z modelu wyuczonego)" : "(WZÓR — model wyuczony nie zadziałał)"}`);
console.log(`kroków do policzenia:${Math.round((parsed.tEnd ?? 300) / dtUzyty).toLocaleString("pl-PL")}`);

// Która cecha wypada poza zakres uczenia — najczestsza przyczyna zejscia
// na wzor zapasowy, i jednoczesnie powod, dla ktorego regresja bez straznika
// potrafila strzelic o dwa rzedy wielkosci.
if (wyuczony && cal.timestep.range) {
  const x = featureVector(cechy);
  const poza: string[] = [];
  for (let i = 1; i < x.length && i < cal.timestep.range.length; i++) {
    const [lo, hi] = cal.timestep.range[i];
    const margines = 0.1 * Math.max(1e-9, hi - lo);
    if (x[i] < lo - margines || x[i] > hi + margines) {
      poza.push(`${TIMESTEP_TERMS[i]}: ${x[i].toFixed(3)} poza [${lo.toFixed(3)}; ${hi.toFixed(3)}]`);
    }
  }
  if (poza.length) {
    console.log(`\ncechy POZA zakresem uczenia — dlatego użyto wzoru:`);
    for (const p of poza) console.log(`  • ${p}`);
  } else {
    console.log(`\nwszystkie cechy w zakresie uczenia.`);
  }
}

// ─── Warianty ────────────────────────────────────────────────────────────────

const plan = planRuns(input, { calibration: cal });

if (plan.blocked) {
  console.log(`\nPLANER ZABLOKOWANY: ${plan.blocked}`);
  process.exit(0);
}

console.log(`\n── warianty ──`);
console.log("kafel        maszyna   rdz  proc   czas h   widełki h        cena");
for (const [nazwa, w] of [["eco", plan.eco], ["kompromis", plan.balanced], ["fast", plan.fast]] as const) {
  if (!w) continue;
  const spec = getSpec(w.serverType);
  console.log(
    `${nazwa.padEnd(13)}${w.serverType.padEnd(10)}${String(w.cores).padStart(3)}  ` +
    `${String(w.mpiProcs).padStart(4)}  ${w.wallHours.toFixed(1).padStart(7)}  ` +
    `${w.wallLoHours.toFixed(1).padStart(6)}–${w.wallHiHours.toFixed(1).padEnd(7)}  ` +
    `${w.price.toFixed(2).padStart(9)} zł  (${spec ? spec.eurPerHour.toFixed(4) : "?"} €/h)`
  );
}

console.log(`\nwidełki z kalibracji: ×${cal.spreadLo.toFixed(2)} … ×${cal.spreadHi.toFixed(2)}`);
console.log(`kalibracja z ${cal.samples} biegów${cal.updatedAt ? `, ${cal.updatedAt.slice(0, 16).replace("T", " ")}` : ""}`);
