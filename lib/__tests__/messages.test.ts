import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import pl from "@/messages/pl.json";

// ─── Kompletność tłumaczeń przestrzeni DWUJĘZYCZNYCH ─────────────────────────
//
// Serwis chmurowy (fdsrun.com) działa po polsku i po angielsku — klient FDS bywa
// zagraniczny. Witryna usługowa (fp-solutions.pl) jest wyłącznie polska i jej
// przestrzenie świadomie nie mają wersji EN: middleware odbija tam /en/*.
//
// Brak klucza nie wywraca strony — i na tym polega kłopot. `i18n/request.ts`
// scala EN na PL, więc nieprzetłumaczony fragment po cichu pokazuje POLSKIE
// zdanie w angielskim interfejsie. Ten test zamienia ciche pogorszenie
// w głośny błąd na CI.

/** Przestrzenie serwowane w obu językach — zebrane ze stron i komponentów chmury. */
const BILINGUAL = [
  "admin", "auth", "billing", "cfdNav", "charts", "cloudFeatures", "cloudLanding",
  "cloudNav", "cloudPricing", "kb", "profile", "reportsHistory", "stats", "status",
  "symDashboard", "symDetail", "symHistory", "symulacje",
] as const;

type Messages = Record<string, unknown>;

function flatten(obj: Messages, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    // Tablice (sekcje dokumentów, listy punktów) traktujemy jako liść —
    // scalanie EN na PL też podmienia je w całości, nie po indeksach.
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flatten(value as Messages, full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const plMsg = pl as unknown as Messages;
const enMsg = en as unknown as Messages;

describe("tłumaczenia przestrzeni dwujęzycznych", () => {
  it.each(BILINGUAL)("„%s” istnieje w obu językach", (ns) => {
    expect(plMsg[ns], `brak ${ns} w messages/pl.json`).toBeTruthy();
    expect(enMsg[ns], `brak ${ns} w messages/en.json`).toBeTruthy();
  });

  it.each(BILINGUAL)("„%s” nie ma braków w EN", (ns) => {
    const plKeys = flatten(plMsg[ns] as Messages, ns);
    const enKeys = new Set(flatten(enMsg[ns] as Messages, ns));
    const missing = plKeys.filter((k) => !enKeys.has(k));
    expect(missing, `nieprzetłumaczone na EN: ${missing.join(", ")}`).toEqual([]);
  });

  it("EN nie niesie kluczy, których nie ma w PL", () => {
    // Osierocony klucz w EN to zwykle ślad po usuniętej funkcji albo literówka
    // w nazwie — w obu przypadkach martwy tekst, którego nikt nie zobaczy.
    // Wyjątek: `legal.courtesy` istnieje wyłącznie po angielsku, bo to nota
    // o kurtuazyjnym charakterze tłumaczenia dokumentów prawnych.
    const allowed = new Set(["legal.courtesy"]);
    const plKeys = new Set(flatten(plMsg));
    const orphans = flatten(enMsg).filter((k) => !plKeys.has(k) && !allowed.has(k));
    expect(orphans).toEqual([]);
  });
});
