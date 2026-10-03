/**
 * Generator `.env.local.example` z rejestru `lib/env.ts`.
 *
 *   npm run env:przyklad
 *
 * Wzorzec konfiguracji powstaje z tego samego źródła, z którego korzysta
 * `npm run preflight` — dzięki temu nie da się dodać zmiennej do kodu
 * i zapomnieć o niej we wzorcu (tak właśnie rozjechały się poprzednie wersje).
 */
import fs from "node:fs";
import path from "node:path";
import { CAPABILITY_IMPACT, ENV_VARS, type Capability } from "../lib/env";

const HEADER = `# Wzorzec konfiguracji — skopiuj do .env.local i uzupełnij wartości.
#
# PLIK GENEROWANY: nie edytuj ręcznie. Źródłem jest lib/env.ts,
# a wzorzec odświeża \`npm run env:przyklad\`.
#
# Sprawdzenie, czego brakuje na tym wdrożeniu: \`npm run preflight\`.
# Zmienne z przedrostkiem NEXT_PUBLIC_ trafiają do przeglądarki — reszta NIE
# i nigdy nie wolno ich tak nazwać.
`;

const order: Capability[] = ["core", "mail", "compute", "payments", "ops"];
const lines: string[] = [HEADER];

for (const capability of order) {
  const vars = ENV_VARS.filter((v) => v.capability === capability);
  if (!vars.length) continue;

  const impact = CAPABILITY_IMPACT[capability];
  lines.push(`\n# ${"─".repeat(72)}`);
  lines.push(`# ${impact.label.toUpperCase()}`);
  lines.push(`# Bez wymaganych zmiennych: ${impact.missing}`);
  lines.push(`# ${"─".repeat(72)}`);

  for (const v of vars) {
    lines.push("");
    lines.push(`# ${v.purpose}`);
    if (v.fallback) lines.push(`# Gdy puste, kod używa: ${v.fallback}`);
    lines.push(v.required ? `${v.name}=` : `# ${v.name}=`);
  }
}

const out = lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
const target = path.resolve(__dirname, "..", ".env.local.example");
fs.writeFileSync(target, out, "utf8");
console.log(`Zapisano ${path.basename(target)} — ${ENV_VARS.length} zmiennych.`);
