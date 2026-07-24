// Wspólny builder adresów kanonicznych i hreflang dla routingu next-intl.
// PL jest domyślny (bez prefiksu), EN ma prefiks /en (localePrefix: "as-needed").
//
// Serwis żyje pod DWOMA domenami obsługiwanymi przez ten sam projekt:
//   • MARKETING (fp-solutions.pl) — usługi konsultingowe, blog, kalkulatory,
//   • CLOUD     (fdsrun.com)      — serwis chmurowy FDSRun (konto, symulacje, admin).
// Każda sekcja ma własny adres kanoniczny, żeby te same treści nie indeksowały
// się pod dwiema domenami. NEXT_PUBLIC_APP_URL wskazuje chmurę (używają jej też
// linki w mailach i callback maszyny liczącej), więc marketing MUSI mieć własną
// zmienną — inaczej przełączenie APP_URL przestawiłoby canonical całej witryny.

const strip = (url: string) => url.replace(/\/$/, "");

export const MARKETING_SITE = strip(
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://fp-solutions.pl"
);

export const CLOUD_SITE = strip(
  process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com"
);

export interface SeoUrls {
  canonical: string;
  languages: Record<string, string>;
}

function build(site: string, locale: string, path: string): SeoUrls {
  const clean = path === "/" ? "" : `/${path.replace(/^\/|\/$/g, "")}`;
  const pl = `${site}${clean}`;
  const en = `${site}/en${clean}`;
  return {
    canonical: locale === "en" ? en : pl,
    languages: {
      pl,
      en,
      "x-default": pl,
    },
  };
}

/**
 * Adresy kanoniczne witryny usługowej (fp-solutions.pl) — usługi, blog,
 * kalkulatory, strony SEO.
 *
 * @param locale aktywny język ("pl" | "en")
 * @param path   ścieżka bez prefiksu języka, np. "/cfd" lub "/" dla strony głównej
 */
export function seoUrls(locale: string, path: string): SeoUrls {
  return build(MARKETING_SITE, locale, path);
}

/**
 * Adresy kanoniczne serwisu chmurowego (fdsrun.com) — landing produktu,
 * estymator, pulpit i pozostałe strony FDSRun.
 *
 * @param locale aktywny język ("pl" | "en")
 * @param path   ścieżka bez prefiksu języka, np. "/symulacje/nowa"
 */
export function cloudSeoUrls(locale: string, path: string): SeoUrls {
  return build(CLOUD_SITE, locale, path);
}
