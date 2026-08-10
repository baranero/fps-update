import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Dwa języki obsługuje WYŁĄCZNIE serwis chmurowy (fdsrun.com) — klient FDS
  // bywa zagraniczny. Witryna usługowa fp-solutions.pl zostaje polska: jej
  // strony nie mają tłumaczeń i spadają na PL przez fallback w request.ts.
  locales: ["pl", "en"],
  defaultLocale: "pl",
  // PL bez prefiksu (dotychczasowe adresy się nie zmieniają), EN pod /en.
  localePrefix: "as-needed",
  // Bez zgadywania po Accept-Language: dany adres ma ZAWSZE ten sam język — to
  // samo widzi robot i użytkownik, a cache Vercela nie musi wariantować po
  // nagłówku. Język zmienia się jawnie, przełącznikiem w belce (LocaleToggler).
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
