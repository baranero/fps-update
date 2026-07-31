"use client";

import { ReactNode, useState } from "react";

// Prymitywy działów strony zlecenia — w języku wzoru graficznego: numerowany
// kicker w mono, nagłówek Manrope, panel na cienkiej kresce ze znacznikami
// narożników. Wyciągnięte, bo strona zlecenia to teraz sześć powtarzalnych
// sekcji i bez tego każda miałaby własny, lekko inny nagłówek.

export function Section({
  index,
  kicker,
  title,
  hint,
  actions,
  children,
}: {
  index?: string;
  kicker: string;
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-hairline pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="mb-2 flex items-center gap-2 font-mono text-fr-label uppercase text-muted">
            {index && <span className="text-primary">{index}</span>}
            {kicker}
          </span>
          <h2 className="font-heading text-fr-h3 text-ink">{title}</h2>
          {hint && <p className="mt-2 max-w-2xl text-fr-sm text-muted">{hint}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/* ── Panel z detalem narożników ──────────────────────────────────────────── */
export function Plate({ children, className = "", dots }: { children: ReactNode; className?: string; dots?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-card border border-hairline bg-panel ${className}`}>
      {dots && <div className="fr-dots pointer-events-none absolute inset-0 opacity-40" />}
      <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t border-hairline" />
      <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 border-r border-t border-hairline" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-2 w-2 border-b border-l border-hairline" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 border-b border-r border-hairline" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ── Siatka odczytów ─────────────────────────────────────────────────────── */
export function SpecGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return <div className={`grid grid-cols-1 gap-x-8 gap-y-6 ${c}`}>{children}</div>;
}

export function Spec({
  label,
  value,
  unit,
  hint,
  tone = "text-ink",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-fr-label uppercase text-muted">{label}</p>
      <p className={`fr-num font-heading text-fr-h3 ${tone}`}>
        {value}
        {unit && <span className="ml-1.5 font-mono text-fr-sm text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-fr-sm text-muted">{hint}</p>}
    </div>
  );
}

/* ── Zakładki ────────────────────────────────────────────────────────────── */
export function Tabs({
  tabs,
  children,
}: {
  tabs: { id: string; label: string; badge?: string }[];
  children: (active: string) => ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap gap-1.5 border-b border-hairline-soft pb-3">
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 rounded-chip border px-3 py-1.5 font-mono text-fr-label uppercase transition-colors ${
                on ? "border-primary/40 bg-primary/10 text-primary" : "border-hairline text-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.badge && <span className="text-muted">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
      <div className="pt-5">{children(active)}</div>
    </div>
  );
}

/* ── Stronicowanie ───────────────────────────────────────────────────────── */
export function Pager({
  page,
  pages,
  total,
  from,
  to,
  onPage,
  labelRange,
  labelPrev,
  labelNext,
}: {
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
  onPage: (p: number) => void;
  labelRange: string;
  labelPrev: string;
  labelNext: string;
}) {
  if (pages <= 1) return null;
  const btn =
    "rounded-chip border border-hairline px-3 py-1.5 font-mono text-fr-label uppercase text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft pt-4">
      <span className="font-mono text-fr-label uppercase text-muted">{labelRange}</span>
      <div className="flex items-center gap-2">
        <button className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1}>
          {labelPrev}
        </button>
        <span className="fr-num font-mono text-fr-label text-ink">
          {page} / {pages}
        </span>
        <button className={btn} onClick={() => onPage(page + 1)} disabled={page >= pages}>
          {labelNext}
        </button>
      </div>
    </div>
  );
}
