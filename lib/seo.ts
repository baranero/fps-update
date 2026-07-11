// Wspólny builder adresów kanonicznych i hreflang dla routingu next-intl.
// PL jest domyślny (bez prefiksu), EN ma prefiks /en (localePrefix: "as-needed").

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-solutions.pl").replace(/\/$/, "");

export interface SeoUrls {
  canonical: string;
  languages: Record<string, string>;
}

/**
 * Zwraca canonical dla bieżącego języka oraz komplet alternatywnych wersji
 * językowych (hreflang), gotowe do wstawienia w `metadata.alternates`.
 *
 * @param locale aktywny język ("pl" | "en")
 * @param path   ścieżka bez prefiksu języka, np. "/cfd" lub "/" dla strony głównej
 */
export function seoUrls(locale: string, path: string): SeoUrls {
  const clean = path === "/" ? "" : `/${path.replace(/^\/|\/$/g, "")}`;
  const pl = `${SITE}${clean}`;
  const en = `${SITE}/en${clean}`;
  return {
    canonical: locale === "en" ? en : pl,
    languages: {
      pl,
      en,
      "x-default": pl,
    },
  };
}
