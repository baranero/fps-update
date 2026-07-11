import type { ReactNode } from "react";

// Typograficzny nagłówek sekcji zamiast „pigułki z pulsującą kropką".
// Monospace + wersaliki + cienka kreska; opcjonalny indeks (np. „01")
// w kolorze akcentu — jak oznaczenia na rysunku technicznym.

export default function Kicker({
  index,
  children,
  className = "",
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 ${className}`}
    >
      <span className="h-px w-5 bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
      {index && <b className="font-semibold text-primary">{index}</b>}
      {children}
    </span>
  );
}
