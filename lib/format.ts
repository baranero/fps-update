// Współdzielone formatery (data, cena, godziny, komórki siatki) — dwujęzyczne.
//
// Serwis chmurowy działa po polsku i angielsku, więc formatowanie NIE może być
// zaszyte na "pl-PL": inne separatory tysięcy, inny zapis daty i inna jednostka
// („tys." vs „k"). Waluta zostaje złotówką w obu wersjach — rozliczamy w PLN —
// zmienia się tylko zapis symbolu.
//
// Użycie w komponencie: `const f = useFormat();` i dalej `f.fmtPrice(x)`.
// W kodzie bez kontekstu i18n (API, maile): `makeFormat("en")`.

import { useLocale } from "next-intl";

type Loc = "pl" | "en";

const norm = (locale: string): Loc => (locale === "en" ? "en" : "pl");
const intl = (l: Loc) => (l === "en" ? "en-GB" : "pl-PL");

export function fmtDateTime(d: string | null | undefined, locale: string = "pl"): string {
  if (!d) return "—";
  return new Date(d).toLocaleString(intl(norm(locale)), {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDate(
  d: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
  locale: string = "pl"
): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(
    intl(norm(locale)),
    opts ?? { day: "numeric", month: "short", year: "numeric" }
  );
}

export function fmtPrice(
  p: number | null | undefined,
  opts?: { decimals?: boolean },
  locale: string = "pl"
): string {
  if (p == null) return "—";
  const l = norm(locale);
  const digits = opts?.decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined;
  return p.toLocaleString(intl(l), digits) + (l === "en" ? " PLN" : " zł");
}

export function fmtEur(v: number | null | undefined, decimals = 2, locale: string = "pl"): string {
  if (v == null) return "—";
  return v.toLocaleString(intl(norm(locale)), {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }) + " €";
}

export function fmtHours(h: number | null | undefined): string {
  if (h == null) return "—";
  if (h < 1) return Math.round(h * 60) + " min";
  return h.toFixed(1) + " h";
}

export function fmtCells(n: number | null | undefined, locale: string = "pl"): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} ${norm(locale) === "en" ? "k" : "tys."}`;
  return String(n);
}

/** Liczba całkowita z separatorem tysięcy wg języka (obiekty, komórki, sztuki). */
export function fmtInt(n: number | null | undefined, locale: string = "pl"): string {
  if (n == null) return "—";
  return n.toLocaleString(intl(norm(locale)));
}

/** Etykieta miesiąca na osi wykresów, np. „lip 25" / „Jul 25". */
export function fmtMonth(d: Date, locale: string = "pl"): string {
  return d.toLocaleDateString(intl(norm(locale)), { month: "short", year: "2-digit" });
}

export interface Format {
  fmtDateTime: (d: string | null | undefined) => string;
  fmtDate: (d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  fmtPrice: (p: number | null | undefined, opts?: { decimals?: boolean }) => string;
  fmtEur: (v: number | null | undefined, decimals?: number) => string;
  fmtHours: (h: number | null | undefined) => string;
  fmtCells: (n: number | null | undefined) => string;
  fmtInt: (n: number | null | undefined) => string;
  fmtMonth: (d: Date) => string;
  locale: string;
}

/** Formatery związane z językiem — do kodu bez kontekstu i18n (API, maile). */
export function makeFormat(locale: string): Format {
  return {
    fmtDateTime: (d) => fmtDateTime(d, locale),
    fmtDate: (d, opts) => fmtDate(d, opts, locale),
    fmtPrice: (p, opts) => fmtPrice(p, opts, locale),
    fmtEur: (v, decimals) => fmtEur(v, decimals, locale),
    fmtHours,
    fmtCells: (n) => fmtCells(n, locale),
    fmtInt: (n) => fmtInt(n, locale),
    fmtMonth: (d) => fmtMonth(d, locale),
    locale,
  };
}

/** Formatery w języku aktywnej strony. Działa w komponentach serwera i klienta. */
export function useFormat(): Format {
  return makeFormat(useLocale());
}
