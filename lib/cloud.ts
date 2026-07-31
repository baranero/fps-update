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

// Cała przestrzeń konta mieszka pod /symulacje/* (pulpit, kreator, historia,
// rozliczenia, statystyki, profil, raporty, admin). Pod /narzedzia zostały
// wyłącznie stuby przekierowań po starych adresach — trzymamy je na liście
// chmury, żeby na fdsrun.com wykonały redirect zamiast wypaść 301 na
// fp-solutions.pl, gdzie docelowe strony nie istnieją.
const CLOUD_PATHS = [
  "/chmura", "/funkcje", "/cennik",
  "/symulacje", "/signin", "/signup", "/auth",
  "/narzedzia/admin", "/narzedzia/profil", "/narzedzia/raporty",
];

export function isCloudPath(pathname: string): boolean {
  return CLOUD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Czy renderować markę chmury (FDSRun). Produkcja: z SITE_MODE (statycznie).
// Dev: po ścieżce. Używane przez Header/Footer.
export function resolveIsCloud(pathname: string): boolean {
  return SITE_MODE ? SITE_MODE === "cloud" : isCloudPath(pathname);
}
