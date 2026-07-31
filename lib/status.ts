// Jedno źródło prawdy dla statusów zleceń FDS — etykiety PL, tony akcentów
// i kolory wykresów. Wcześniej każda strona miała własną mapę (rozjazd nazw
// "W toku" vs "W trakcie" i palet `green-100 dark:green-900`). Importuj stąd wszędzie.
//
// Kolor idzie przez tony systemu FDSRun (primary/signal/warn/ok/muted), a nie
// przez surową paletę Tailwinda — dzięki temu badge statusu ma tę samą formę,
// co chipy na landingu i sam przełącza motyw, bez ani jednego `dark:`.

import { chipCls, type Tone } from "@/lib/tone";

export type StatusKey =
  | "pending" | "dispatched" | "running"
  | "done" | "failed" | "error" | "cancelled";

export type StatusMeta = { label: string; tone: Tone; cls: string };

const TONES: Record<string, { label: string; tone: Tone }> = {
  pending:    { label: "Oczekuje",   tone: "warn" },
  dispatched: { label: "W kolejce",  tone: "signal" },
  running:    { label: "W toku",     tone: "signal" },
  done:       { label: "Zakończone", tone: "ok" },
  failed:     { label: "Błąd",       tone: "primary" },
  error:      { label: "Błąd",       tone: "primary" },
  cancelled:  { label: "Anulowane",  tone: "muted" },
};

function meta(label: string, tone: Tone): StatusMeta {
  return { label, tone, cls: chipCls(tone) };
}

export const STATUS: Record<string, StatusMeta> = Object.fromEntries(
  Object.entries(TONES).map(([key, { label, tone }]) => [key, meta(label, tone)])
);

export const DEFAULT_STATUS: StatusMeta = meta("—", "muted");

export function statusMeta(key: string): StatusMeta {
  return STATUS[key] ?? DEFAULT_STATUS;
}

// Statusy dostępne do ręcznego ustawienia w panelu admina.
export const ADMIN_STATUS_KEYS = ["pending", "running", "done", "failed", "cancelled"] as const;

// Grupy pomocnicze (filtry, statystyki).
export const ACTIVE_STATUSES = new Set<string>(["pending", "dispatched", "running"]);
export const isActive = (s: string) => ACTIVE_STATUSES.has(s);
export const isFailed = (s: string) => s === "failed" || s === "error";

// Kolory serii na wykresach (donut / rozkład statusów). Recharts przyjmuje
// wyłącznie konkretne wartości, więc tokeny --fr-ok / --fr-warn / --fr-faint
// i czerwień marki są tu wypisane liczbowo — po jednym komplecie na motyw,
// tak samo jak paleta serii w `components/Cloud/chartTheme.ts`.
export const STATUS_CHART_LIGHT = {
  done: "#15803D",
  active: "#B45309",
  failed: "#DC3545",
  cancelled: "#8C939F",
} as const;

export const STATUS_CHART_DARK = {
  done: "#4ADE80",
  active: "#FBB040",
  failed: "#DC3545",
  cancelled: "#6E727A",
} as const;

export function statusChart(dark: boolean) {
  return dark ? STATUS_CHART_DARK : STATUS_CHART_LIGHT;
}
