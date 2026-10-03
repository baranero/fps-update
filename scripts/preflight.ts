/**
 * Kontrola gotowości wdrożenia: co jest skonfigurowane, a co nie ruszy.
 *
 *   npm run preflight
 *
 * Czyta .env.local (albo zmienne już obecne w środowisku) i mówi wprost, który
 * obszar serwisu działa. Zamiast odkrywać brak klucza z błędu 500 na produkcji.
 *
 * Kod wyjścia: 1, gdy brakuje czegoś WYMAGANEGO w rdzeniu — w pozostałych
 * przypadkach 0, bo serwis bez płatności czy crona nadal działa, tyle że węziej.
 */
import fs from "node:fs";
import path from "node:path";
import { CAPABILITY_IMPACT, ENV_VARS, checkEnv, type Capability } from "../lib/env";

/** Wczytanie .env.local bez dokładania zależności — format jest prosty. */
function readEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    // Spacje wokół „=" są tolerowane (tak samo robi dotenv), więc trymujemy oba boki.
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

const root = path.resolve(__dirname, "..");
const fileEnv = readEnvFile(path.join(root, ".env.local"));
// Zmienna ustawiona w powłoce wygrywa z plikiem — tak samo zachowuje się Next.
const env = { ...fileEnv, ...process.env };

const OK = "\u2713";
const NO = "\u2717";
const WARN = "\u2022";

console.log("\nGOTOWOŚĆ WDROŻENIA — FDSRun\n" + "=".repeat(60));

const reports = checkEnv(env);
let coreBroken = false;

for (const r of reports) {
  const impact = CAPABILITY_IMPACT[r.capability];
  const mark = r.ready ? OK : NO;
  console.log(`\n${mark} ${impact.label}`);

  if (!r.ready) {
    if (r.capability === "core") coreBroken = true;
    console.log(`  ${impact.missing}`);
    for (const name of r.missingRequired) {
      const v = ENV_VARS.find((e) => e.name === name)!;
      console.log(`  ${NO} ${name}`);
      console.log(`      ${v.purpose}`);
    }
  }

  for (const name of r.missingOptional) {
    const v = ENV_VARS.find((e) => e.name === name)!;
    const note = v.fallback ? `domyślnie: ${v.fallback}` : "bez wartości domyślnej";
    console.log(`  ${WARN} ${name} — nieustawione (${note})`);
  }
}

// ── Zmienne ustawione, a nieużywane przez kod ────────────────────────────────
// Najczęstsze źródło zamieszania przy wdrożeniu: zmienna została po funkcji,
// której już nie ma, i przy czytaniu konfiguracji wygląda na potrzebną.
const known = new Set(ENV_VARS.map((v) => v.name));
const strays = Object.keys(fileEnv).filter(
  (k) => !known.has(k) && !k.startsWith("NODE_") && !k.startsWith("npm_")
);
if (strays.length) {
  console.log("\n" + "-".repeat(60));
  console.log("Ustawione, ale nieużywane przez kod — do usunięcia z konfiguracji:");
  for (const k of strays) console.log(`  ${WARN} ${k}`);
}

// ── Podsumowanie ─────────────────────────────────────────────────────────────
const ready = reports.filter((r) => r.ready).length;
console.log("\n" + "=".repeat(60));
console.log(`Obszary gotowe: ${ready}/${reports.length}`);

const blocked = reports.filter((r) => !r.ready).map((r) => CAPABILITY_IMPACT[r.capability].label);
if (blocked.length) console.log(`Zablokowane: ${blocked.join(", ")}`);

// Bramka uruchamiania obliczeń nie jest zmienną środowiskową — mieszka w bazie
// (profiles.sim_access), więc przypominamy o niej osobno.
console.log(
  "\nDostęp klientów do uruchamiania obliczeń nie zależy od env, tylko od\n" +
  "kolumny profiles.sim_access — uruchom supabase/migration_sim_access.sql\n" +
  "i przyznawaj dostęp w panelu admina (zakładka Użytkownicy)."
);
console.log();

process.exit(coreBroken ? 1 : 0);
