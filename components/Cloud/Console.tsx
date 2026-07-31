import { ReactNode } from "react";

// Konsola zlecenia — trójpanelowa rama „przyrządowa" ze wzoru graficznego.
//
// Istnieje jako WSPÓLNY komponent, bo ten sam układ pełni dwie role:
//   • na stronie głównej pokazuje, jak wygląda praca z FDSRun (dane poglądowe),
//   • na /symulacje/[caseId] jest realnym pulpitem zlecenia (dane z serwera).
// Gdyby każde miejsce miało własną kopię, obietnica z landingu rozjechałaby się
// z produktem przy pierwszej zmianie stylu — a to najgorszy rodzaj niespójności.
//
// Boczne szyny znikają poniżej lg/xl: na telefonie zostaje sam wykres.

export function Console({
  left,
  title,
  meta,
  children,
  right,
  className = "",
}: {
  left?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex w-full overflow-hidden rounded-card border border-hairline bg-well shadow-fr-panel ${className}`}
    >
      <div className="flex h-full w-full">
        {left && (
          <div className="hidden w-[260px] shrink-0 flex-col border-r border-hairline-soft bg-panel-deep lg:flex">
            {left}
          </div>
        )}

        <div className="relative flex min-w-0 flex-1 flex-col bg-well">
          <div className="fr-grid pointer-events-none absolute inset-0" />

          <div className="relative z-10 flex items-center justify-between gap-4 border-b border-hairline-soft bg-well/80 px-5 py-4 backdrop-blur-sm md:px-8">
            <span className="truncate font-mono text-fr-label uppercase text-ink">{title}</span>
            {meta && (
              <span className="shrink-0 font-mono text-fr-label uppercase text-muted">{meta}</span>
            )}
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
        </div>

        {right && (
          <div className="z-20 hidden w-[300px] shrink-0 flex-col border-l border-hairline-soft bg-panel-deep xl:flex">
            {right}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Nagłówek szyny (identyfikator zlecenia) ─────────────────────────────── */
export function ConsoleHead({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="border-b border-hairline-soft p-6">
      <div className="mb-1 flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full bg-signal ${
            live ? "animate-pulse shadow-[0_0_8px_rgb(var(--fr-signal)/0.6)]" : ""
          }`}
        />
        <span className="text-fr-label font-bold uppercase text-ink">{label}</span>
      </div>
      <div className="ml-5 truncate font-mono text-fr-label text-muted">{value}</div>
    </div>
  );
}

/* ── Odczyt telemetrii z opcjonalnym przebiegiem ─────────────────────────── */
export function ConsoleMetric({
  label,
  value,
  unit,
  tone = "text-ink",
  spark,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: string;
  spark?: string;
}) {
  return (
    <div>
      <span className="mb-3 block border-b border-hairline-soft pb-2 text-fr-label uppercase text-muted">
        {label}
      </span>
      <div className="mb-1 flex items-end justify-between gap-2">
        <span className={`fr-num font-mono text-[20px] leading-none ${tone}`}>{value}</span>
        {unit && <span className="font-mono text-fr-label text-muted">{unit}</span>}
      </div>
      {spark && (
        <svg className="mt-2 h-8 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d={spark} fill="none" strokeWidth="0.5" className="stroke-signal" opacity="0.7" />
        </svg>
      )}
    </div>
  );
}

/* ── Sekcja szyny (STATUS SIATEK / LOG OBLICZEŃ) ─────────────────────────── */
export function ConsolePane({
  title,
  badge,
  deep,
  children,
}: {
  title: string;
  badge?: string;
  deep?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col p-6 ${deep ? "bg-well" : "border-b border-hairline-soft"}`}>
      <div className="mb-6 flex items-center justify-between">
        <span className="text-fr-label uppercase text-muted">{title}</span>
        {badge && (
          <span className="rounded-chip border border-signal/30 px-1.5 py-0.5 font-mono text-fr-label uppercase text-signal">
            {badge}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/* ── Wiersz statusu (siatka / etap) ──────────────────────────────────────── */
export function ConsoleRow({
  label,
  value,
  state = "idle",
}: {
  label: string;
  value: string;
  state?: "ok" | "warn" | "idle";
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-tile border border-hairline-soft bg-panel px-3 py-3 ${
        state === "idle" ? "opacity-55" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            state === "ok" ? "bg-signal" : state === "warn" ? "bg-primary" : "bg-muted"
          }`}
        />
        <span className="truncate font-mono text-fr-label uppercase text-ink">{label}</span>
      </div>
      <span
        className={`shrink-0 font-mono text-fr-sm ${
          state === "ok" ? "text-signal" : state === "warn" ? "text-primary" : "text-muted"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Wpis logu na osi ────────────────────────────────────────────────────── */
export function ConsoleLog({ entries }: { entries: { time: string; msg: string; tone?: "ink" | "signal" | "muted" }[] }) {
  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute bottom-2 left-[5px] top-2 w-px bg-hairline" />
      <div className="space-y-5">
        {entries.map(({ time, msg, tone = "ink" }) => (
          <div key={`${time}-${msg}`} className="relative pl-6">
            <span
              className={`absolute left-[3.5px] top-1.5 h-[4px] w-[4px] rounded-full ${
                tone === "signal" ? "bg-signal" : tone === "muted" ? "bg-muted" : "bg-muted"
              }`}
            />
            <div className="mb-1 font-mono text-fr-label uppercase text-muted">{time}</div>
            <div className={`break-words font-mono text-fr-sm ${tone === "muted" ? "text-muted" : "text-ink"}`}>
              {msg}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
