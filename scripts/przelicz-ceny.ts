// ─── Przeliczenie historycznych zleceń na obowiązujący cennik ────────────────
//
// Uruchomienie (domyślnie SUCHA PRÓBA — nic nie zapisuje):
//
//   npm run przelicz-ceny
//   npm run przelicz-ceny -- --csv=raport.csv
//   npm run przelicz-ceny -- --zapisz            ← dopiero to pisze do bazy
//
// ── Metoda ───────────────────────────────────────────────────────────────────
//
// Nową cenę liczy `priceAtCurrentTariff` z lib/fds/margin.ts — ten sam moduł,
// z którego korzysta panel marży. Koszt bierze się z realnego czasu życia
// maszyny (dispatched_at → completed_at) razy stawka godzinowa z katalogu, plus
// magazyn z tej samej estymaty, na której stoi wycena wstępna. Skrypt niczego
// nie liczy po swojemu: gdyby duplikował wzory, cennik i przeliczenie mogłyby
// się rozjechać po pierwszej zmianie stawek.
//
// Metoda nie zależy od tego, jakim wzorem wyceniono zlecenie pierwotnie —
// obejmuje więc także wiersze sprzed obecnego cennika.
//
// ── Kontrola: odwrócenie starej ceny ─────────────────────────────────────────
//
// Niezależnie od powyższego skrypt ODWRACA zapisaną cenę przez poprzedni wzór
// marży (25× → 10×) i porównuje wynikający z niej koszt z kosztem policzonym
// z czasu maszyny. Zgodność potwierdza, że zlecenie wyceniono tamtym cennikiem
// i że obie drogi dają to samo. Rozbieżność oznacza wiersz wyceniony jeszcze
// inaczej — cena i tak zostanie przeliczona (metoda wprost tego nie potrzebuje),
// ale raport go wskaże, żeby dało się sprawdzić dlaczego.

import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { priceAtCurrentTariff, rowCost, type MarginRow } from "@/lib/fds/margin";
import { progressiveMarkup, EUR_PLN } from "@/lib/fds/pricing";

// ─── Poprzedni cennik — wyłącznie do kontroli ────────────────────────────────
//
// Stałe zamrożone z wersji pricing.ts sprzed zmiany stawek (commit b3777b8).
// Nie wolno ich podpinać pod obowiązujący cennik: służą do odtworzenia tego,
// co było, a nie tego, co jest.
const STARY = { MARKUP_MAX: 25, MARKUP_MIN: 10, COST_LO: 0.05, COST_HI: 3.0, EUR_PLN: 4.3, CENA_MIN: 1 };

function staraMarza(c: number): number {
  if (c <= STARY.COST_LO) return STARY.MARKUP_MAX;
  if (c >= STARY.COST_HI) return STARY.MARKUP_MIN;
  const t = Math.log(c / STARY.COST_LO) / Math.log(STARY.COST_HI / STARY.COST_LO);
  return STARY.MARKUP_MAX - (STARY.MARKUP_MAX - STARY.MARKUP_MIN) * t;
}

const staraCena = (c: number) =>
  Math.max(STARY.CENA_MIN, Math.round(c * staraMarza(c) * STARY.EUR_PLN));

/** Z zapisanej ceny [zł] wyciąga koszt [EUR] wg starego wzoru. Null = poza zakresem. */
function odwrocStaraCene(cena: number): number | null {
  if (!Number.isFinite(cena) || cena < STARY.CENA_MIN || staraCena(1000) < cena) return null;
  let a = 0, b = 1000;
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (staraCena(m) >= cena) b = m; else a = m; }
  const dolna = b;
  a = dolna; b = 1000;
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (staraCena(m) > cena) b = m; else a = m; }
  return (dolna + a) / 2;
}

// ─── Wejście ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const maFlage = (n: string) => argv.includes(n);
const wartosc = (n: string) => argv.find((a) => a.startsWith(n + "="))?.split("=").slice(1).join("=");

// Najmniejsza kwota, jaką realnie da się pobrać: Stripe odrzuca płatności
// poniżej ~2 zł, a koszt obsługi transakcji i tak przewyższa wtedy należność.
// Ceny poniżej progu nie są błędem wyliczenia — po prostu nie nadają się do
// zafakturowania i trzeba o nich zdecydować osobno.
const MIN_FAKTUROWALNA = 2.0;

// Powyżej tej względnej różnicy uznajemy, że kontrola się nie zgadza.
const TOLERANCJA = 0.15;

// Kontrola ma sens dopiero powyżej pewnego kosztu. Przy zleceniach groszowych
// o starej cenie decydowała podłoga 1 zł, a nie wzór marży — odwrócenie zwraca
// wtedy liczbę bez związku z kosztem i różnica procentowa jest szumem.
const KONTROLA_OD_PLN = 1.0;

const ZAPISZ = maFlage("--zapisz");
const Z_OPLACONYMI = maFlage("--z-oplaconymi");
const CSV = wartosc("--csv");

// Opcjonalna podłoga ceny — np. --podloga=2 podnosi wszystko poniżej progu
// fakturowalności. Domyślnie wyłączona: cennik świadomie jej nie ma.
const PODLOGA = Number(wartosc("--podloga") ?? "0") || 0;

// .env.local czytamy sami — skrypt ma działać bez dodatkowych flag node.
function wczytajEnv(sciezka = ".env.local"): Record<string, string> {
  const out: Record<string, string> = {};
  let tekst = "";
  try { tekst = readFileSync(sciezka, "utf8"); } catch { return out; }
  for (const linia of tekst.split(/\r?\n/)) {
    const m = linia.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...wczytajEnv(), ...process.env };
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Odczyt ──────────────────────────────────────────────────────────────────

type Wiersz = MarginRow & {
  case_id: string;
  created_at: string;
  payment_status: string | null;
};

const { data, error } = await db
  .from("fds_submissions")
  .select("case_id, created_at, status, payment_status, price, server_type, dispatched_at, completed_at, total_cells, t_end")
  .eq("status", "done")
  .order("created_at", { ascending: true });

if (error) {
  console.error("Błąd odczytu:", error.message);
  process.exit(1);
}

const wiersze = (data ?? []) as Wiersz[];

// ─── Przeliczenie ────────────────────────────────────────────────────────────

interface Wynik {
  case_id: string;
  data: string;
  oplacone: boolean;
  staraCena: number;
  kosztPln: number | null;
  nowaCena: number | null;
  nowaMarza: number | null;
  /** Koszt odtworzony ze starej ceny — kontrola. */
  kosztOdwrocony: number | null;
  /** Względna różnica obu dróg liczenia kosztu. */
  rozbieznosc: number | null;
  powod: string | null;
}

const wyniki: Wynik[] = wiersze.map((r) => {
  const stara = Number(r.price);
  const koszt = rowCost(r);
  const wyliczona = priceAtCurrentTariff(r);
  const nowa = wyliczona === null ? null : Math.max(PODLOGA, wyliczona);

  const baza: Wynik = {
    case_id: r.case_id,
    data: r.created_at?.slice(0, 10) ?? "?",
    oplacone: r.payment_status === "paid",
    staraCena: Number.isFinite(stara) ? stara : 0,
    kosztPln: koszt ? koszt.costPln : null,
    nowaCena: nowa,
    nowaMarza: koszt ? progressiveMarkup(koszt.rawEur) : null,
    kosztOdwrocony: null,
    rozbieznosc: null,
    powod: null,
  };

  if (!koszt || nowa === null) {
    return { ...baza, powod: "brak maszyny lub znaczników czasu — nie ma czego rozliczyć" };
  }

  // Kontrola przez odwrócenie starej ceny.
  const odwr = baza.staraCena > 0 ? odwrocStaraCene(baza.staraCena) : null;
  if (odwr !== null) {
    baza.kosztOdwrocony = odwr * EUR_PLN;
    baza.rozbieznosc = Math.abs(odwr - koszt.rawEur) / Math.max(koszt.rawEur, 1e-9);
  }

  return baza;
});

const przeliczalne = wyniki.filter((w) => w.powod === null);
const pominiete = wyniki.filter((w) => w.powod !== null);
const oplacone = przeliczalne.filter((w) => w.oplacone);
const objete = Z_OPLACONYMI ? przeliczalne : przeliczalne.filter((w) => !w.oplacone);

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sumaStara = suma(objete.map((w) => w.staraCena));
const sumaNowa = suma(objete.map((w) => w.nowaCena ?? 0));
const sumaKoszt = suma(objete.map((w) => w.kosztPln ?? 0));
const kosztWszystkich = suma(przeliczalne.map((w) => w.kosztPln ?? 0));

// ─── Raport ──────────────────────────────────────────────────────────────────

// Echo argumentow: bez tego nie sposob odroznic "flagi nie podano" od "flaga
// nie dolecila" (PowerShell potrafi zjesc separator `--` przy npm run).
function naglowekTrybu(): void {
  console.log("");
  console.log(ZAPISZ ? "⚠  ZAPIS DO BAZY" : "sucha proba - nic nie zapisuje");
  console.log(`argumenty: ${argv.length ? argv.join(" ") : "(brak)"}`);
  if (!ZAPISZ && argv.some((a) => a.includes("zapisz"))) {
    console.log("UWAGA: w argumentach jest slowo 'zapisz', ale flaga --zapisz nie zostala rozpoznana.");
    console.log("       Uzyj: npm run przelicz-ceny:zapisz");
  }
}

const zl = (n: number) => n.toFixed(2) + " zł";

naglowekTrybu();
console.log("═".repeat(74));
console.log(`zleceń zakończonych:              ${wiersze.length}`);
console.log(`da się przeliczyć:                ${przeliczalne.length}`);
console.log(`pominiętych:                      ${pominiete.length}`);
console.log(`  opłaconych przez Stripe:        ${oplacone.length}${Z_OPLACONYMI ? "  (WŁĄCZONE flagą)" : "  (pominięte domyślnie)"}`);
console.log(`objętych tym przebiegiem:         ${objete.length}`);
console.log("─".repeat(74));
console.log(`suma cen obecnych:   ${zl(sumaStara)}`);
console.log(`suma cen nowych:     ${zl(sumaNowa)}`);
console.log(`różnica:             ${sumaNowa >= sumaStara ? "+" : ""}${zl(sumaNowa - sumaStara)}`);
console.log(`koszt maszyn:        ${zl(sumaKoszt)}`);
if (sumaKoszt > 0) {
  console.log(`krotność obecna:     ${(sumaStara / sumaKoszt).toFixed(2)}×`);
  console.log(`krotność po zmianie: ${(sumaNowa / sumaKoszt).toFixed(2)}×`);
}
console.log(`\nkoszt maszyn wszystkich przeliczalnych: ${zl(kosztWszystkich)}`);
console.log("  (porównaj z liczbą, na której kalibrowałeś stawki w pricing.ts)");

// Kontrola kompletnosci: kwota moze wisiec takze na zleceniu, ktore nie jest
// "done" (np. anulowanym po czesciowym biegu). Takie wiersze wypadaja z
// przeliczenia, wiec musza byc widoczne, zeby nie zostaly po starym cenniku.
const { data: inneZeKwota } = await db
  .from("fds_submissions")
  .select("case_id, created_at, status, price")
  .neq("status", "done")
  .gt("price", 0);

const poza = (inneZeKwota ?? []) as Array<{ case_id: string; created_at: string; status: string; price: number }>;
if (poza.length) {
  console.log("");
  console.log("⚠  zlecenia z kwota POZA przeliczeniem (status inny niz done)");
  for (const r of poza) {
    console.log(`    ${r.case_id.padEnd(22)}${r.created_at.slice(0, 10)}  ${r.status.padEnd(10)} ${Number(r.price).toFixed(2).padStart(9)} zl`);
  }
  console.log(`    razem ${poza.length}, na kwote ${zl(suma(poza.map((r) => Number(r.price))))}`);
  console.log("    (te zostaja bez zmian - zdecyduj osobno, czy maja byc do zaplaty)");
}

// ─── Kierunek zmiany ─────────────────────────────────────────────────────────
//
// Suma portfela potrafi zamaskować to, co najważniejsze: przeliczenie nie
// przesuwa wszystkich cen w tę samą stronę. Zlecenia wycenione poniżej kosztu
// z marżą DROŻEJĄ, a te wycenione zawyżoną marżą TANIEJĄ. Bez tego rozbicia
// nie da się ocenić, komu i o ile zmienia się cena.
const wgora = objete.filter((w) => (w.nowaCena ?? 0) > w.staraCena);
const wdol  = objete.filter((w) => (w.nowaCena ?? 0) < w.staraCena);
const bezZmian = objete.length - wgora.length - wdol.length;

const krotnoscStara = (w: Wynik) => ((w.kosztPln ?? 0) > 0 ? w.staraCena / (w.kosztPln ?? 1) : 0);

console.log("");
console.log("— kierunek zmiany —");
console.log(`  w górę:    ${String(wgora.length).padStart(3)} zleceń   ${zl(suma(wgora.map((w) => w.staraCena)))} → ${zl(suma(wgora.map((w) => w.nowaCena ?? 0)))}`);
console.log(`  w dół:     ${String(wdol.length).padStart(3)} zleceń   ${zl(suma(wdol.map((w) => w.staraCena)))} → ${zl(suma(wdol.map((w) => w.nowaCena ?? 0)))}`);
console.log(`  bez zmian: ${String(bezZmian).padStart(3)}`);

if (wgora.length) {
  const naj = [...wgora].sort((a, b) => (b.nowaCena ?? 0) - b.staraCena - ((a.nowaCena ?? 0) - a.staraCena)).slice(0, 5);
  console.log("  największe podwyżki (te zlecenia były wycenione poniżej modelu):");
  for (const w of naj) {
    console.log(
      `    ${w.case_id.padEnd(22)}${w.data}  koszt ${(w.kosztPln ?? 0).toFixed(2).padStart(7)}  ` +
      `${w.staraCena.toFixed(2).padStart(8)} → ${(w.nowaCena ?? 0).toFixed(2).padStart(8)}  ` +
      `(marża była ${krotnoscStara(w).toFixed(2)}×)`
    );
  }
}

if (wdol.length) {
  const naj = [...wdol].sort((a, b) => a.staraCena - (a.nowaCena ?? 0) - (b.staraCena - (b.nowaCena ?? 0))).slice(0, 5);
  console.log("  największe obniżki:");
  for (const w of naj) {
    console.log(
      `    ${w.case_id.padEnd(22)}${w.data}  koszt ${(w.kosztPln ?? 0).toFixed(2).padStart(7)}  ` +
      `${w.staraCena.toFixed(2).padStart(8)} → ${(w.nowaCena ?? 0).toFixed(2).padStart(8)}  ` +
      `(marża była ${krotnoscStara(w).toFixed(2)}×)`
    );
  }
}

// Kontrola zgodności obu dróg liczenia kosztu.
const zKontrola = przeliczalne.filter((w) => w.rozbieznosc !== null && (w.kosztPln ?? 0) >= KONTROLA_OD_PLN);
const rozjechane = zKontrola.filter((w) => (w.rozbieznosc ?? 0) > TOLERANCJA);
console.log("\n— kontrola: koszt z czasu maszyny vs odwrócona stara cena —");
console.log(`  porównywalnych:  ${zKontrola.length}`);
console.log(`  zgodnych (±${(TOLERANCJA * 100).toFixed(0)}%): ${zKontrola.length - rozjechane.length}`);
console.log(`  rozjechanych:    ${rozjechane.length}`);
if (rozjechane.length) {
  console.log("  (te wyceniono innym wzorem — nowa cena i tak jest policzona wprost z kosztu)");
  for (const w of rozjechane.slice(0, 12)) {
    console.log(
      `    ${w.case_id.padEnd(22)}${w.data}  z czasu ${(w.kosztPln ?? 0).toFixed(2).padStart(8)}` +
      `  z ceny ${(w.kosztOdwrocony ?? 0).toFixed(2).padStart(8)}  różnica ${((w.rozbieznosc ?? 0) * 100).toFixed(0)}%`
    );
  }
  if (rozjechane.length > 12) console.log(`    … i ${rozjechane.length - 12} więcej`);
}

const ponizej = objete.filter((w) => (w.nowaCena ?? 0) < MIN_FAKTUROWALNA);
if (ponizej.length) {
  console.log("\n— poniżej progu fakturowalności —");
  console.log(`  ${ponizej.length} zleceń zejdzie poniżej ${MIN_FAKTUROWALNA.toFixed(2)} zł (minimum Stripe)`);
  console.log(`  łącznie: ${zl(suma(ponizej.map((w) => w.staraCena)))} → ${zl(suma(ponizej.map((w) => w.nowaCena ?? 0)))}`);
  console.log(`  najniższa nowa cena: ${zl(Math.min(...ponizej.map((w) => w.nowaCena ?? 0)))}`);
}

if (pominiete.length) {
  console.log("\n— pominięte —");
  for (const w of pominiete) {
    console.log(`  ${w.case_id.padEnd(22)}${w.data}  obecnie ${w.staraCena.toFixed(2).padStart(9)} zł  — ${w.powod}`);
  }
  console.log(`  ich obecna wartość: ${zl(suma(pominiete.map((w) => w.staraCena)))} (zostaje bez zmian)`);
}

console.log("\n— pierwsze 15 przeliczonych —");
console.log("zlecenie              data        koszt zł   stara zł    nowa zł   marża");
for (const w of objete.slice(0, 15)) {
  console.log(
    `${w.case_id.padEnd(22)}${w.data}  ${(w.kosztPln ?? 0).toFixed(2).padStart(8)}  ` +
    `${w.staraCena.toFixed(2).padStart(9)}  ${(w.nowaCena ?? 0).toFixed(2).padStart(9)}  ${(w.nowaMarza ?? 0).toFixed(2)}×`
  );
}

if (CSV) {
  const naglowek = "case_id,data,oplacone,koszt_pln,koszt_z_ceny_pln,rozbieznosc_proc,cena_stara,cena_nowa,marza_nowa,powod\n";
  const linie = wyniki.map((w) => [
    w.case_id, w.data, w.oplacone ? "tak" : "nie",
    w.kosztPln?.toFixed(2) ?? "", w.kosztOdwrocony?.toFixed(2) ?? "",
    w.rozbieznosc !== null ? (w.rozbieznosc * 100).toFixed(1) : "",
    w.staraCena.toFixed(2), w.nowaCena?.toFixed(2) ?? "",
    w.nowaMarza?.toFixed(2) ?? "", w.powod ?? "",
  ].join(",")).join("\n");
  writeFileSync(CSV, naglowek + linie, "utf8");
  console.log(`\nraport zapisany: ${CSV}`);
}

// ─── Zapis ───────────────────────────────────────────────────────────────────

if (!ZAPISZ) {
  console.log("\nNic nie zapisano. Aby zapisać: dopisz --zapisz");
  process.exit(0);
}

// Zapis jest nieodwracalny, więc najpierw musi istnieć kolumna na kopię
// pierwotnej ceny — inaczej stara kwota przepada bezpowrotnie.
const { error: brakKolumny } = await db.from("fds_submissions").select("case_id, price_old").limit(1);
if (brakKolumny) {
  console.error("\nBRAK KOLUMNY price_old — uruchom najpierw:");
  console.error("  supabase/migration_price_backup.sql");
  console.error(`(odpowiedź bazy: ${brakKolumny.message})`);
  process.exit(1);
}

// price_old wypełniamy WYŁĄCZNIE raz. Przy kolejnej korekcie cennika ma nadal
// wskazywać pierwszą cenę, jaką zobaczył klient, a nie poprzednią iterację.
const { data: istniejace, error: bladOdczytu } = await db
  .from("fds_submissions")
  .select("case_id, price_old")
  .eq("status", "done");

if (bladOdczytu) {
  console.error("Błąd odczytu price_old:", bladOdczytu.message);
  process.exit(1);
}

const maKopie = new Set(
  ((istniejace ?? []) as Array<{ case_id: string; price_old: number | null }>)
    .filter((r) => r.price_old !== null)
    .map((r) => r.case_id)
);

console.log(`\nZapisuję ${objete.length} wierszy…`);
console.log(`  kopii price_old do założenia: ${objete.filter((w) => !maKopie.has(w.case_id)).length}`);

let ok = 0, bled = 0;
for (const w of objete) {
  const zmiany: Record<string, number | null> = { price: w.nowaCena };
  if (!maKopie.has(w.case_id)) zmiany.price_old = w.staraCena;

  const { error: e } = await db.from("fds_submissions").update(zmiany).eq("case_id", w.case_id);
  if (e) { console.error(`  ${w.case_id}: ${e.message}`); bled++; } else ok++;
}

console.log(`zapisanych: ${ok}, błędów: ${bled}`);
if (ok > 0) {
  console.log("\nCofnięcie zmiany:");
  // Warunek na status jest KONIECZNY: price_old maja rowniez zlecenia nieudane,
  // wyzerowane przez migration_clear_failed_price.sql. Cofniecie bez tego filtra
  // przywrociloby im kwoty, ktorych nikt nigdy nie mial pobrac.
  console.log("  UPDATE fds_submissions SET price = price_old");
  console.log("  WHERE status = 'done' AND price_old IS NOT NULL;");
}
