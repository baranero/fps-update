// Współdzielone formatery PL (data, cena, godziny, komórki siatki).
// Zastępują powielone lokalne funkcje w /admin, /rozliczenia, /statystyki itd.

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pl-PL", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pl-PL", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

export function fmtPrice(p: number | null | undefined, opts?: { decimals?: boolean }): string {
  if (p == null) return "—";
  const digits = opts?.decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined;
  return p.toLocaleString("pl-PL", digits) + " zł";
}

export function fmtHours(h: number | null | undefined): string {
  if (h == null) return "—";
  if (h < 1) return Math.round(h * 60) + " min";
  return h.toFixed(1) + " h";
}

export function fmtCells(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} tys.`;
  return String(n);
}
