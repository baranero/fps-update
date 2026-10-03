/**
 * Które migracje są na tej bazie, a których brakuje.
 *
 *   npm run sprawdz-baze
 *
 * Migracje uruchamia się ręcznie w SQL Editorze, więc baza potrafi rozjechać
 * się z kodem po cichu — funkcje zapisujące (dziennik zdarzeń, powód
 * niepowodzenia) świadomie milczą przy braku kolumn, żeby nie wywracać
 * zlecenia. Skutek: nic nie krzyczy, a dane nie powstają.
 *
 * Skrypt jest WYŁĄCZNIE do odczytu: sonduje schemat pustymi zapytaniami
 * (`limit 0`), niczego nie tworzy i nie zmienia.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SCHEMA_PROBES, isMissingSchemaError, type SchemaProbe } from "../lib/dbChecks";

function readEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key) out[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const root = path.resolve(__dirname, "..");
const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "\nBrak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Uzupełnij .env.local (patrz `npm run preflight`) i spróbuj ponownie.\n"
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** Jedna sonda. Zwraca null, gdy element jest — albo komunikat, gdy go nie ma. */
async function probe(p: SchemaProbe): Promise<string | null> {
  if (p.kind === "function") {
    // Funkcja `append_fds_log` to UPDATE po `case_id`. Wołamy ją z numerem,
    // który nie może istnieć, i pustym fragmentem — trafia w zero wierszy,
    // więc sondowanie jest bezpieczne.
    const { error } = await db.rpc(p.table, {
      p_case_id: "__sonda-schematu__",
      p_chunk: "",
    });
    return error ? error.message : null;
  }

  if (p.kind === "data") {
    // Migracja danych nie zostawia śladu w schemacie — pytamy o jej skutek.
    // `head: true` pobiera samą liczbę, bez ani jednego wiersza.
    let q = db.from(p.table).select("case_id", { count: "exact", head: true });
    for (const [column, cond] of Object.entries(p.emptyWhere ?? {})) {
      if (cond.in) q = q.in(column, cond.in);
      if (cond.gt !== undefined) q = q.gt(column, cond.gt);
    }
    const { error, count } = await q;
    if (error) return error.message;
    return count && count > 0 ? `wierszy do poprawienia: ${count}` : null;
  }

  // `limit 0` — PostgREST i tak sprawdza tabelę oraz kolumnę, ale nie pobiera
  // ani jednego wiersza, więc sonda nie dotyka danych klientów.
  const { error } = await db.from(p.table).select(p.column ?? "*").limit(0);
  return error ? error.message : null;
}

const OK = "\u2713";
const NO = "\u2717";

console.log("\nSTAN MIGRACJI BAZY\n" + "=".repeat(64));

const missing: SchemaProbe[] = [];
const broken: Array<{ p: SchemaProbe; message: string }> = [];

for (const p of SCHEMA_PROBES) {
  const message = await probe(p);
  const what =
    p.kind === "table" ? `tabela ${p.table}`
    : p.kind === "function" ? `funkcja ${p.table}()`
    : p.kind === "data" ? `dane w ${p.table}`
    : `${p.table}.${p.column}`;

  if (!message) {
    console.log(`${OK} ${p.migration.padEnd(36)} ${what}`);
    continue;
  }

  if (p.kind === "data" || isMissingSchemaError(message)) {
    missing.push(p);
    const opis = p.kind === "data" ? `NIEURUCHOMIONA: ${what} (${message})` : `BRAK: ${what}`;
    console.log(`${NO} ${p.migration.padEnd(36)} ${opis}`);
    console.log(`    ${p.impact}`);
  } else {
    // Inny błąd niż brak elementu (uprawnienia, sieć) — nie udajemy, że wiemy.
    broken.push({ p, message });
    console.log(`? ${p.migration.padEnd(36)} nie udało się sprawdzić: ${message}`);
  }
}

console.log("\n" + "=".repeat(64));

if (!missing.length && !broken.length) {
  console.log(`${OK} Schemat zgodny z kodem — wszystkie migracje uruchomione.\n`);
  process.exit(0);
}

if (missing.length) {
  const critical = missing.filter((p) => p.critical);
  console.log(`Brakuje ${missing.length} migracji (krytycznych: ${critical.length}).`);
  console.log("\nUruchom w Supabase SQL Editor, w tej kolejności:\n");
  for (const p of missing) console.log(`  supabase/${p.migration}`);
  console.log(
    "\nPliki są idempotentne (IF NOT EXISTS) — ponowne uruchomienie niczego nie zepsuje."
  );
}

if (broken.length) {
  console.log("\nSprawdzenia nieudane z innego powodu niż brak elementu:");
  for (const b of broken) console.log(`  ${b.p.migration}: ${b.message}`);
}

console.log();
// Brak migracji KRYTYCZNEJ to powód do zatrzymania wdrożenia.
process.exit(missing.some((p) => p.critical) ? 1 : 0);
