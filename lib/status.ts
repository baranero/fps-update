// Jedno źródło prawdy dla statusów zleceń FDS — tony akcentów i kolory wykresów.
// Wcześniej każda strona miała własną mapę (rozjazd nazw "W toku" vs "W trakcie"
// i palet `green-100 dark:green-900`). Importuj stąd wszędzie.
//
// ETYKIETY tu NIE mieszkają: serwis jest dwujęzyczny, więc nazwa statusu idzie
// z tłumaczeń (namespace `status`, klucze = StatusKey). `statusMeta()` zwraca
// klucz, a komponent renderuje `t(meta.key)`.
//
// Kolor idzie przez tony systemu FDSRun (primary/signal/warn/ok/muted), a nie
// przez surową paletę Tailwinda — dzięki temu badge statusu ma tę samą formę,
// co chipy na landingu i sam przełącza motyw, bez ani jednego `dark:`.

import { chipCls, type Tone } from "@/lib/tone";

export type StatusKey =
  | "pending" | "dispatched" | "running"
  | "done" | "failed" | "error" | "cancelled";

/** `key` wskazuje wpis w namespace `status` (tam „unknown" to myślnik). */
export type StatusMeta = { key: StatusKey | "unknown"; tone: Tone; cls: string };

const TONES: Record<StatusKey, Tone> = {
  pending:    "warn",
  dispatched: "signal",
  running:    "signal",
  done:       "ok",
  failed:     "primary",
  error:      "primary",
  cancelled:  "muted",
};

function meta(key: StatusKey | "unknown", tone: Tone): StatusMeta {
  return { key, tone, cls: chipCls(tone) };
}

export const STATUS: Record<string, StatusMeta> = Object.fromEntries(
  Object.entries(TONES).map(([key, tone]) => [key, meta(key as StatusKey, tone)])
);

export const DEFAULT_STATUS: StatusMeta = meta("unknown", "muted");

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
