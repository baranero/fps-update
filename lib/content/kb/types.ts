// Model treści bazy wiedzy FDSRun (fdsrun.com/baza-wiedzy).
//
// Artykuły chmury NIE mieszkają w messages/pl.json jak blog usługowy: kurs FDS
// z listingami wsadów rozsadziłby ten plik (ma już ~100 kB), a next-intl ładuje
// go w całości przy każdej stronie. Jeden artykuł = jeden moduł TS, więc treść
// trafia wyłącznie do bundle'a swojej podstrony, a wsady FDS można pisać wprost
// — bez ucieczek JSON-a i bez łamania wieloliniowych namelistów.
//
// Tekst w blokach obsługuje dwa proste znaczniki inline (patrz components/Kb/
// PostBody.tsx): `kod` w grawisach i **pogrubienie**.

export type KbBlock =
  /** Akapit. */
  | { type: "p"; text: string }
  /** Śródtytuł H2; `n` to numer sekcji w stylu rysunku technicznego („01"). */
  | { type: "h"; text: string; n?: string }
  /** Lista wypunktowana lub numerowana. */
  | { type: "list"; items: string[]; ordered?: boolean }
  /** Listing wsadu FDS / wyjścia solvera — monospace, przewijany poziomo. */
  | { type: "code"; text: string; caption?: string }
  /** Wyróżniona uwaga („uważaj na…"). */
  | { type: "note"; title?: string; text: string }
  /** Tabela danych; wszystkie wiersze muszą mieć tyle kolumn co `head`. */
  | { type: "table"; head: string[]; rows: string[][]; caption?: string }
  /** Domknięcie sekcji linkiem do produktu. */
  | { type: "cta"; text: string; linkText: string; href: string };

/** Treść artykułu w jednym języku. */
export interface KbContent {
  title: string;
  /** Zajawka na liście — służy też za `description` w metadanych. */
  lead: string;
  tags: string[];
  blocks: KbBlock[];
}

export interface KbPost {
  /** Segment adresu, wspólny dla obu języków: /baza-wiedzy/<slug>. */
  slug: string;
  /** ISO (RRRR-MM-DD) — sortowanie listy i atrybut `dateTime`. */
  date: string;
  /** Szacowany czas czytania w minutach. */
  readingMinutes: number;
  /** Numer lekcji, jeśli artykuł jest częścią kursu „FDS + PyroSim od zera". */
  lesson?: number;
  /** Treść po polsku — wymagana, bo PL jest językiem domyślnym serwisu. */
  pl: KbContent;
  /**
   * Treść po angielsku. Brak = artykuł jeszcze nieprzetłumaczony: nie pojawia
   * się na liście /en/baza-wiedzy ani w mapie witryny. Świadomie NIE robimy
   * fallbacku na polski tekst — czytelnik EN dostałby artykuł, którego nie
   * przeczyta, a Google zaindeksowałby polską treść pod angielskim adresem.
   */
  en?: KbContent;
}

/** Treść artykułu w danym języku (lub `undefined`, gdy brak tłumaczenia). */
export function kbContent(post: KbPost, locale: string): KbContent | undefined {
  return locale === "en" ? post.en : post.pl;
}

/** Pozycja programu kursu. Bez `slug` = lekcja zapowiedziana, jeszcze bez treści. */
export interface CourseLesson {
  n: number;
  title: string;
  summary: string;
  slug?: string;
}
