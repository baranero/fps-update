// Jedno źródło prawdy dla statusów zleceń FDS — etykiety PL, kolory badge'y
// i kolory wykresów. Wcześniej każda strona miała własną mapę (rozjazd nazw
// "W toku" vs "W trakcie" itd.). Importuj stąd wszędzie.

export type StatusKey =
  | "pending" | "dispatched" | "running"
  | "done" | "failed" | "error" | "cancelled";

export type StatusMeta = { label: string; cls: string };

export const STATUS: Record<string, StatusMeta> = {
  pending:    { label: "Oczekuje",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  dispatched: { label: "W kolejce",  cls: "bg-sky-100   text-sky-700   dark:bg-sky-900/30   dark:text-sky-400" },
  running:    { label: "W toku",     cls: "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400" },
  done:       { label: "Zakończone", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  failed:     { label: "Błąd",       cls: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400" },
  error:      { label: "Błąd",       cls: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400" },
  cancelled:  { label: "Anulowane",  cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
};

export const DEFAULT_STATUS: StatusMeta = {
  label: "—",
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function statusMeta(key: string): StatusMeta {
  return STATUS[key] ?? DEFAULT_STATUS;
}

// Statusy dostępne do ręcznego ustawienia w panelu admina.
export const ADMIN_STATUS_KEYS = ["pending", "running", "done", "failed", "cancelled"] as const;

// Grupy pomocnicze (filtry, statystyki).
export const ACTIVE_STATUSES = new Set<string>(["pending", "dispatched", "running"]);
export const isActive = (s: string) => ACTIVE_STATUSES.has(s);
export const isFailed = (s: string) => s === "failed" || s === "error";

// Kolory serii na wykresach (donut / rozkład statusów).
export const STATUS_CHART = {
  done: "#22c55e",
  active: "#f59e0b",
  failed: "#ef4444",
  cancelled: "#94a3b8",
} as const;
