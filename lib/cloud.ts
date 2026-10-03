// Rozróżnienie „chmura (FDSRun) vs usługi (FP Solutions)" na jednym repo.
//
// PRODUKCJA: jedno repo, dwa projekty Vercel. Każdy projekt ustawia build-time
// `NEXT_PUBLIC_SITE_MODE` (cloud | marketing), więc decyzja o marce i treści roota
// jest STATYCZNA (bez host-detection, bez migotania, czysty adres fdsrun.com/).
// DEV: jeden origin (localhost), SITE_MODE nieustawione → rozpoznajemy po ŚCIEŻCE.
//
// Uwaga: middleware ma własną kopię listy ścieżek (działa na `rest`) — przy
// zmianie ścieżek chmury zaktualizuj oba miejsca.

export type SiteMode = "cloud" | "marketing";

// Który produkt serwuje TEN projekt Vercel. null = dev/preview (fallback po ścieżce).
export const SITE_MODE: SiteMode | null =
  process.env.NEXT_PUBLIC_SITE_MODE === "cloud"
    ? "cloud"
    : process.env.NEXT_PUBLIC_SITE_MODE === "marketing"
    ? "marketing"
    : null;

// Baza adresu serwisu chmury (osobna domena) — do linków krzyżowych i maili.
export const CLOUD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com";

// Baza adresu witryny usługowej — do linków krzyżowych z chmury.
export const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://fp-solutions.pl";

// Link wejścia do chmury (+ opcjonalna ścieżka, np. "/signup"). W produkcji
// absolutny na fdsrun.com; w dev względny, żeby nawigacja została lokalna.
export function cloudUrl(path = ""): string {
  if (process.env.NODE_ENV === "development") return path || "/chmura";
  return `${CLOUD_URL}${path}`;
}

// Lustro cloudUrl() w drugą stronę: link z fdsrun.com na fp-solutions.pl
// (np. kalkulatory z historii raportów). W dev zostaje względny, żeby nie
// wyrzucać z localhosta na produkcję.
export function marketingUrl(path = ""): string {
  if (process.env.NODE_ENV === "development") return path || "/narzedzia";
  return `${MARKETING_URL}${path}`;
}

// ŚCIEŻKA strony głównej FDSRun w bieżącym projekcie — do nawigacji wewnątrz
// aplikacji (router.push), więc bez hosta. W projekcie „cloud" landing stoi pod
// czystym „/", w dev pod „/chmura" (bo „/" serwuje wtedy witrynę usług).
// Używane po wylogowaniu i po usunięciu konta: użytkownik ma wylądować na
// landingu FDSRun, a nie na ekranie logowania ani na stronie usługowej.
export function cloudHomePath(): string {
  return SITE_MODE === "cloud" ? "/" : "/chmura";
}

// ─── Mapa ścieżek: co należy do chmury, a co do witryny usługowej ────────────
//
// JEDYNE źródło prawdy. Middleware importuje stąd te same listy — wcześniej
// miał własną kopię i przy każdej zmianie ścieżek trzeba było pamiętać o dwóch
// miejscach (komentarz w obu plikach o tym ostrzegał, co samo w sobie było
// znakiem, że reguła mieszka w złym miejscu).

/** Cała przestrzeń konta i witryna produktu FDSRun. Root „/" obsługiwany osobno. */
export const CLOUD_PATHS = [
  "/chmura", "/funkcje", "/cennik", "/baza-wiedzy",
  "/symulacje", "/signin", "/signup", "/auth",
] as const;

/**
 * Stare adresy konta pod /narzedzia → ich dzisiejsze miejsce w chmurze.
 *
 * Wcześniej każdy z nich był osobnym komponentem klienckim, który po
 * zamontowaniu robił `router.replace(...)`: pusta klatka przed przeskokiem,
 * pobrany bundle i — co ważniejsze — robot dostawał 200 na adresie, który ma
 * zniknąć. Teraz przekierowuje middleware (301), a strony zostają wyłącznie
 * jako zapas, gdyby żądanie go ominęło (lib/legacyRedirect.ts).
 */
export const LEGACY_PATHS: Record<string, string> = {
  "/narzedzia/admin": "/symulacje/admin",
  "/narzedzia/profil": "/symulacje/profil",
  "/narzedzia/raporty": "/symulacje/raporty",
  "/narzedzia/rozliczenia": "/symulacje/rozliczenia",
  "/narzedzia/statystyki": "/symulacje/statystyki",
  "/narzedzia/symulacje": "/symulacje",
};

/**
 * Docelowa ścieżka dla starego adresu — albo null, gdy adres nie jest stary.
 * Obsługuje też segmenty pod spodem, np. /narzedzia/symulacje/FDS-X → /symulacje/FDS-X.
 */
export function legacyTarget(pathname: string): string | null {
  for (const [from, to] of Object.entries(LEGACY_PATHS)) {
    if (pathname === from) return to;
    if (pathname.startsWith(from + "/")) return to + pathname.slice(from.length);
  }
  return null;
}

/**
 * Czy ścieżka należy do serwisu chmurowego (fdsrun.com).
 *
 * Stare adresy /narzedzia/* też liczą się do chmury: ich przekierowanie
 * wykonuje projekt chmurowy, więc gość nie odbija się najpierw na
 * fp-solutions.pl, gdzie strony docelowej nie ma.
 */
export function isCloudPath(pathname: string): boolean {
  if (legacyTarget(pathname)) return true;
  return CLOUD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Czy renderować markę chmury (FDSRun). Produkcja: z SITE_MODE (statycznie).
// Dev: po ścieżce. Używane przez Header/Footer.
export function resolveIsCloud(pathname: string): boolean {
  return SITE_MODE ? SITE_MODE === "cloud" : isCloudPath(pathname);
}
