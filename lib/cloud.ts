// Rozpoznanie sekcji chmurowej po stronie klienta (Header/Footer). Serwis chmury
// FDSRun żyje na fdsrun.com, a treść usług na fp-solutions.pl — ale ten sam kod
// obsługuje obie domeny, więc marki w nagłówku/stopce przełączamy po ŚCIEŻCE.
// `pathname` z next-intl jest bez prefiksu języka. Landing chmury żyje pod
// /chmura (middleware: / → /chmura), więc rozpoznanie działa też na froncie.
//
// Uwaga: middleware ma własną, serwerową kopię tej listy (działa na `rest`) —
// przy zmianie ścieżek chmury zaktualizuj oba miejsca.

export const CLOUD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com";

const CLOUD_PATHS = [
  "/chmura", "/symulacje", "/signin", "/signup", "/auth",
  "/narzedzia/admin", "/narzedzia/profil", "/narzedzia/raporty",
];

export function isCloudPath(pathname: string): boolean {
  return CLOUD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
