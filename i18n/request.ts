import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { routing } from "./routing";
import pl from "../messages/pl.json";

type Messages = AbstractIntlMessages;

// Scalanie „EN na PL": tłumaczymy serwis chmurowy, a witryna usługowa zostaje
// polska. Bez tego każdy klucz nieobecny w en.json (cała warstwa fp-solutions.pl)
// wywracałby stronę w trybie EN. Scalamy GŁĘBOKO, bo braki bywają punktowe —
// pojedynczy klucz wewnątrz przetłumaczonego namespace'u.
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const prev = out[key];
    // Tablice PODMIENIAMY w całości, nie scalamy po indeksach: sekcje
    // dokumentów prawnych i listy punktów to `Section[]`, a scalanie ich jak
    // obiektów zamieniłoby tablicę w obiekt z kluczami "0", "1" — i renderer
    // wywracałby się na `.map` dopiero na buildzie wersji EN.
    const mergeable =
      prev && value &&
      typeof prev === "object" && typeof value === "object" &&
      !Array.isArray(prev) && !Array.isArray(value);
    out[key] = mergeable ? deepMerge(prev as Messages, value as Messages) : value;
  }
  return out as Messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  // Rzutowanie przez `unknown`: messages/pl.json zawiera też tablice obiektów
  // (np. services.cfd.sections), których AbstractIntlMessages nie opisuje, a
  // next-intl i tak podaje je przez `t.raw()`.
  const base = pl as unknown as Messages;
  const messages =
    locale === routing.defaultLocale
      ? base
      : deepMerge(base, (await import(`../messages/${locale}.json`)).default as unknown as Messages);

  return { locale, messages };
});
