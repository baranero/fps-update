// Rozpoznanie sekcji chmurowej po stronie klienta (Header/Footer). Serwis chmury
// FDSRun żyje na fdsrun.com, a treść usług na fp-solutions.pl — ale ten sam kod
// obsługuje obie domeny, więc marki w nagłówku/stopce przełączamy po ŚCIEŻCE.
// `pathname` z next-intl jest bez prefiksu języka. Landing chmury żyje pod
// /chmura (middleware: / → /chmura), więc rozpoznanie działa też na froncie.
//
// Uwaga: middleware ma własną, serwerową kopię tej listy (działa na `rest`) —
// przy zmianie ścieżek chmury zaktualizuj oba miejsca.

export const CLOUD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com";

// Adres wejścia do serwisu chmury (+ opcjonalna ścieżka, np. "/signup").
// W produkcji absolutny na osobną domenę fdsrun.com (bez przeskoku 301).
// W dev (`next dev`) chmura i usługi dzielą jeden origin (localhost) — zwracamy
// link WZGLĘDNY, żeby kliknięcie zostało lokalne zamiast wyskakiwać na produkcję.
// (root chmury lokalnie = /chmura, bo localhost/ to strona usług.)
export function cloudUrl(path = ""): string {
  if (process.env.NODE_ENV === "development") return path || "/chmura";
  return `${CLOUD_URL}${path}`;
}

const CLOUD_PATHS = [
  "/chmura", "/symulacje", "/signin", "/signup", "/auth",
  "/narzedzia/admin", "/narzedzia/profil", "/narzedzia/raporty",
];

export function isCloudPath(pathname: string): boolean {
  return CLOUD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
