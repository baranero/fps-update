// ─── Uzupełnienie cech modelu z zapisanych plików .fds ───────────────────────
//
//   npm run uzupelnij-cechy              ← sucha próba, nic nie zapisuje
//   npm run uzupelnij-cechy:zapisz       ← zapis do bazy
//
// ── Po co ────────────────────────────────────────────────────────────────────
//
// Model kroku czasowego (lib/fds/timestep.ts) uczy się z cech odczytanych
// z pliku wsadowego. Część z nich trafiła do bazy dopiero niedawno — `hrrpua`
// nie ma ANI JEDNO zlecenie historyczne — więc model uczy się bez informacji
// o pożarze, czyli bez tej, która decyduje o kroku czasowym w gęstej geometrii.
//
// Pliki .fds wszystkich zleceń leżą w Supabase Storage. Ten skrypt pobiera je,
// parsuje tym samym parserem, którego używa wycena, i uzupełnia brakujące
// kolumny. Po nim model dostaje komplet cech na całej historii.
//
// ── Zasada ───────────────────────────────────────────────────────────────────
//
// Domyślnie uzupełniamy WYŁĄCZNIE puste pola. Wartości już zapisane zostają
// nietknięte: pochodzą z parsowania przy zgłoszeniu i są tak samo wiarygodne,
// a nadpisywanie ich zamieniłoby uzupełnienie w cichą migrację danych.
// Rozbieżności skrypt raportuje, żeby dało się je obejrzeć — ale sam ich nie
// rozstrzyga.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseFds } from "@/lib/fds/parser";

const BUCKET = "fds-files";

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
const ZAPISZ = argv.includes("--zapisz");

console.log(`argumenty: ${argv.length ? argv.join(" ") : "(brak)"}`);
if (!ZAPISZ && argv.some((a) => a.includes("zapisz"))) {
  console.log("UWAGA: widze slowo 'zapisz', ale flaga --zapisz nie zostala rozpoznana.");
  console.log("       Uzyj: npm run uzupelnij-cechy:zapisz");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Cechy, które uzupełniamy ────────────────────────────────────────────────
//
// Klucz = kolumna w bazie, wartość = jak ją wyliczyć z wyniku parsowania.
type Parsed = ReturnType<typeof parseFds>;
const CECHY: Array<{ kolumna: string; z: (p: Parsed) => number | null }> = [
  { kolumna: "hrrpua", z: (p) => p.hrrpua },
  { kolumna: "min_cell_dim", z: (p) => p.minCellDim },
  { kolumna: "domain_volume", z: (p) => p.domainVolume },
  { kolumna: "obst_count", z: (p) => p.obstCount },
  { kolumna: "mesh_count", z: (p) => p.meshCount },
  { kolumna: "total_cells", z: (p) => p.totalCells },
  { kolumna: "t_end", z: (p) => p.tEnd },
];

interface Wiersz {
  case_id: string;
  file_name: string | null;
  file_path: string | null;
  [k: string]: unknown;
}

const kolumny = ["case_id", "file_name", "file_path", ...CECHY.map((c) => c.kolumna)].join(", ");

const { data, error } = await db
  .from("fds_submissions")
  .select(kolumny)
  .not("file_path", "is", null)
  .order("created_at", { ascending: true });

if (error) {
  console.error("Błąd odczytu:", error.message);
  if (/column .* does not exist|could not find the .* column/i.test(error.message)) {
    console.error("Brakuje kolumny — uruchom supabase/migration_hrrpua.sql.");
  }
  process.exit(1);
}

const wiersze = (data ?? []) as unknown as Wiersz[];
console.log(`\nzleceń z zapisanym plikiem: ${wiersze.length}`);

// ─── Przebieg ────────────────────────────────────────────────────────────────

interface Wynik {
  caseId: string;
  plik: string;
  uzupelnione: Record<string, number>;
  rozbieznosci: Array<{ kolumna: string; wBazie: number; zPliku: number }>;
  blad: string | null;
}

const wyniki: Wynik[] = [];
let licznik = 0;

for (const r of wiersze) {
  licznik++;
  process.stdout.write(`\r  ${licznik}/${wiersze.length} …`);

  const w: Wynik = { caseId: r.case_id, plik: r.file_name ?? "—", uzupelnione: {}, rozbieznosci: [], blad: null };

  const { data: plik, error: bladPobrania } = await db.storage.from(BUCKET).download(r.file_path!);
  if (bladPobrania || !plik) {
    w.blad = bladPobrania?.message ?? "brak pliku w magazynie";
    wyniki.push(w);
    continue;
  }

  let parsed: Parsed;
  try {
    parsed = parseFds(await plik.text());
  } catch (e) {
    w.blad = `parsowanie: ${(e as Error).message}`;
    wyniki.push(w);
    continue;
  }

  if (!parsed.valid) {
    w.blad = `plik nie przeszedł analizy: ${parsed.error ?? "nieznany powód"}`;
    wyniki.push(w);
    continue;
  }

  for (const c of CECHY) {
    const zPliku = c.z(parsed);
    if (zPliku === null || !Number.isFinite(zPliku)) continue;

    const wBazie = r[c.kolumna];
    if (wBazie === null || wBazie === undefined) {
      w.uzupelnione[c.kolumna] = zPliku;
    } else {
      // Rozbieżność ponad 1% — tyle, żeby nie liczyć zaokrągleń.
      const stara = Number(wBazie);
      if (Number.isFinite(stara) && stara !== 0 && Math.abs(zPliku - stara) / Math.abs(stara) > 0.01) {
        w.rozbieznosci.push({ kolumna: c.kolumna, wBazie: stara, zPliku });
      }
    }
  }

  wyniki.push(w);
}

process.stdout.write("\r" + " ".repeat(40) + "\r");

// ─── Raport ──────────────────────────────────────────────────────────────────

const udane = wyniki.filter((w) => !w.blad);
const bledne = wyniki.filter((w) => w.blad);
const doUzupelnienia = udane.filter((w) => Object.keys(w.uzupelnione).length > 0);

console.log(`\n${ZAPISZ ? "⚠  ZAPIS DO BAZY" : "sucha próba — nic nie zapisuję"}`);
console.log("═".repeat(70));
console.log(`przeanalizowanych plików:  ${udane.length}`);
console.log(`nieudanych:                ${bledne.length}`);
console.log(`z czymś do uzupełnienia:   ${doUzupelnienia.length}`);

console.log("\n— pokrycie cech —");
for (const c of CECHY) {
  const brakowalo = udane.filter((w) => c.kolumna in w.uzupelnione).length;
  const mialo = udane.length - brakowalo;
  console.log(`  ${c.kolumna.padEnd(16)} w bazie ${String(mialo).padStart(3)}  do uzupełnienia ${String(brakowalo).padStart(3)}`);
}

const zRozbieznoscia = udane.filter((w) => w.rozbieznosci.length > 0);
if (zRozbieznoscia.length) {
  console.log(`\n— rozbieżności (zostają BEZ ZMIAN, tylko do wglądu) —`);
  for (const w of zRozbieznoscia.slice(0, 15)) {
    for (const r of w.rozbieznosci) {
      console.log(`  ${w.caseId.padEnd(22)}${r.kolumna.padEnd(15)} baza ${r.wBazie}  plik ${r.zPliku}`);
    }
  }
  if (zRozbieznoscia.length > 15) console.log(`  … i ${zRozbieznoscia.length - 15} więcej zleceń`);
}

if (bledne.length) {
  console.log(`\n— nieudane —`);
  for (const w of bledne.slice(0, 15)) {
    console.log(`  ${w.caseId.padEnd(22)}${w.plik.slice(0, 32).padEnd(34)}${w.blad}`);
  }
  if (bledne.length > 15) console.log(`  … i ${bledne.length - 15} więcej`);
}

if (!ZAPISZ) {
  console.log("\nNic nie zapisano. Aby zapisać: npm run uzupelnij-cechy:zapisz");
  process.exit(0);
}

// ─── Zapis ───────────────────────────────────────────────────────────────────

console.log(`\nZapisuję ${doUzupelnienia.length} wierszy…`);
let ok = 0, bled = 0;
for (const w of doUzupelnienia) {
  const { error: e } = await db.from("fds_submissions").update(w.uzupelnione).eq("case_id", w.caseId);
  if (e) { console.error(`  ${w.caseId}: ${e.message}`); bled++; } else ok++;
}
console.log(`zapisanych: ${ok}, błędów: ${bled}`);
console.log("\nUzupełniono tylko puste pola — nic istniejącego nie zostało nadpisane,");
console.log("więc ta operacja nie wymaga cofania.");
console.log("\nTeraz przelicz model:  npx vite-node --config vitest.config.ts scripts/diagnoza-estymacji.ts");
