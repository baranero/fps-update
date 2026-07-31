"use client";

import { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { CHIP_SHAPE, TONE_CHIP, TONE_DOT, TONE_SURFACE, TONE_TEXT, type Tone } from "@/lib/tone";

export { TONE_CHIP, TONE_DOT, TONE_TEXT, chipCls } from "@/lib/tone";
export type { Tone } from "@/lib/tone";

// ── Prymitywy interfejsu FDSRun ───────────────────────────────────────────────
// Jedno źródło prawdy dla przycisków, pól, chipów i nagłówków stron chmury.
// Powstało, bo każda podstrona konta niosła własną kopię tych samych elementów
// (osobne `rounded-md` vs `rounded-panel`, `text-sm` vs `text-fr-sm`, palety
// `green-100/dark:green-900` obok tokenów powierzchni). Efekt: pulpit wyglądał
// jak inny produkt niż landing, mimo że to ta sama usługa.
//
// Zasady, których pilnują te prymitywy:
//   • rozmiary liter wyłącznie ze skali `fr-*` (fr-micro/label/sm/body/h1…h4),
//   • kolory wyłącznie z tokenów powierzchni (canvas/panel/ink/muted/…) i
//     akcentów (primary/signal/warn/ok) — nigdy `dark:` ani surowa paleta,
//   • promienie z „przyrządowej" skali: chip / tile / panel / card.

/* ── Przyciski ───────────────────────────────────────────────────────────────
   `primary` = akcja główna (czerwień marki), `secondary` = na kresce,
   `ghost` = nawigacyjny, `danger` = destrukcyjny (usuń/anuluj zlecenie).
   Wszystkie mają tę samą geometrię — różni je wyłącznie warstwa koloru. */
export type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-panel transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "px-3 py-1.5 text-fr-sm font-semibold",
  md: "px-4 py-2.5 text-fr-body font-semibold",
  lg: "px-7 py-3.5 text-fr-body font-bold",
};

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-primary font-bold text-white hover:opacity-90",
  secondary: "border border-hairline bg-panel text-ink hover:border-primary/40 hover:text-primary",
  ghost: "border border-transparent text-muted hover:bg-panel-deep hover:text-ink",
  danger: "border border-primary/40 bg-primary/[0.07] text-primary hover:bg-primary/15",
};

export function btnCls(variant: BtnVariant = "primary", size: BtnSize = "md", extra = ""): string {
  return `${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${extra}`.trim();
}

export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: BtnVariant;
  size?: BtnSize;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={btnCls(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function BtnLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: BtnVariant;
  size?: BtnSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={btnCls(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ── Pola formularza ─────────────────────────────────────────────────────── */
export const labelCls = "mb-2 block font-mono text-fr-label uppercase text-muted";

export const inputCls =
  "w-full rounded-panel border border-hairline bg-panel-deep px-4 py-3 text-fr-body text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

// Wariant gęsty — paski filtrów, wyszukiwarki nad tabelami, pola w wierszach.
export const inputSmCls =
  "w-full rounded-panel border border-hairline bg-panel-deep px-3 py-2 text-fr-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

export const inputErrCls =
  "w-full rounded-panel border border-primary bg-panel-deep px-4 py-3 text-fr-body text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-1 focus:ring-primary";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-fr-sm text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-fr-sm text-primary">{error}</p>}
    </div>
  );
}

/* ── Chip / etykieta stanu ───────────────────────────────────────────────── */
export function Chip({
  tone = "muted",
  dot,
  pulse,
  className = "",
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`${CHIP_SHAPE} ${TONE_CHIP[tone]} ${className}`}>
      {dot && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]} ${pulse ? "animate-pulse" : ""}`} />
      )}
      {children}
    </span>
  );
}

/* ── Powierzchnie ────────────────────────────────────────────────────────── */
export const cardCls = "rounded-card border border-hairline bg-panel";
export const cardHoverCls =
  "rounded-card border border-hairline bg-panel transition-colors hover:border-primary/40";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`${cardCls} ${className}`}>{children}</div>;
}

/* ── Powłoka podstrony konta ─────────────────────────────────────────────── */
const SHELL_WIDTH = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[1400px]",
} as const;

export function Shell({
  width = "lg",
  children,
}: {
  width?: keyof typeof SHELL_WIDTH;
  children: ReactNode;
}) {
  return (
    <section className="relative z-10 min-h-screen bg-canvas py-10">
      <div className={`container ${SHELL_WIDTH[width]}`}>{children}</div>
    </section>
  );
}

/* ── Nagłówek podstrony ──────────────────────────────────────────────────────
   Kicker „FDSRUN // …" jest podpisem przyrządu — ten sam gest, co numeracja
   rysunków na landingu. Trzymamy go tutaj, żeby nie rozjeżdżał się w treści
   ani w odstępach między stronami. */
export function PageHead({
  kicker,
  title,
  lead,
  actions,
  badge,
  back,
}: {
  kicker: string;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="border-b border-hairline pb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 font-mono text-fr-micro uppercase text-muted transition-colors hover:text-primary"
        >
          <span aria-hidden>←</span>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="mb-2 block font-mono text-fr-micro uppercase text-faint">{kicker}</span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-fr-h2 text-ink">{title}</h1>
            {badge}
          </div>
          {lead && <p className="mt-1.5 text-fr-sm text-muted">{lead}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ── Etykieta działu w obrębie strony ────────────────────────────────────── */
export const sectionLabelCls = "font-mono text-fr-micro uppercase text-faint";

export function SectionLabel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <h2 className={`${sectionLabelCls} ${className}`}>{children}</h2>;
}

/* ── Filtr zakładkowy nad listą ──────────────────────────────────────────────
   Ten sam pasek nad archiwum zleceń i nad rozliczeniami — wcześniej dwie
   kopie, które rozjechały się na rozmiarze liter i kształcie licznika. */
export function FilterTabs<T extends string>({
  tabs,
  active,
  onPick,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onPick: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-hairline">
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={on}
            onClick={() => onPick(tab.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-fr-label uppercase transition-colors ${
              on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {!!tab.count && (
              <span
                className={`fr-num rounded-chip px-1.5 py-0.5 ${
                  on ? "bg-primary/10 text-primary" : "bg-panel-deep text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Stan pusty ──────────────────────────────────────────────────────────── */
export function EmptyState({
  text,
  cta,
  children,
}: {
  text: ReactNode;
  cta?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-hairline px-6 py-10 text-center">
      <p className="text-fr-sm text-muted">{text}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-fr-label uppercase text-primary transition-opacity hover:opacity-80"
        >
          {cta.label} <span aria-hidden>→</span>
        </Link>
      )}
      {children}
    </div>
  );
}

/* ── Tabela gęsta (panel admina, listy techniczne) ───────────────────────────
   Nagłówki jak podpisy przyrządu: mono, wersaliki, `fr-micro`. Treść w skali
   `fr-sm`, liczby zawsze tabularne — inaczej kolumny „skaczą" przy odświeżaniu. */
export const tableCls = "w-full text-fr-sm";
export const theadRowCls = "border-b border-hairline-soft bg-panel-deep";
export const thCls = "px-3 py-2 text-left font-mono text-fr-micro uppercase text-muted";
export const tdCls = "px-3 py-2.5 text-muted";
export const tdNumCls = "fr-num px-3 py-2.5 whitespace-nowrap text-muted";
export const trCls = "bg-panel transition-colors hover:bg-panel-deep";

// Przycisk ikonowy w wierszu tabeli (pobierz / podgląd / usuń).
export function iconBtnCls(danger = false): string {
  return `rounded-tile p-1 text-faint transition-colors ${
    danger ? "hover:bg-primary/10 hover:text-primary" : "hover:bg-panel-deep hover:text-primary"
  }`;
}

/* ── Kafel odczytu (KPI) ─────────────────────────────────────────────────── */
export function Kpi({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`${cardCls} p-5`}>
      <p className="mb-1.5 font-mono text-fr-micro uppercase text-faint">{label}</p>
      <p className={`fr-num font-heading text-fr-h2 ${TONE_TEXT[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-fr-sm text-muted">{sub}</p>}
    </div>
  );
}

/* ── Szkielet ładowania ──────────────────────────────────────────────────── */
export function Skeleton({ className = "h-24" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-panel-deep ${className}`} />;
}

/* ── Komunikat (błąd / ostrzeżenie / potwierdzenie) ──────────────────────── */
export function Notice({
  tone = "primary",
  title,
  children,
  actions,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div role="status" className={`rounded-card border p-4 sm:p-5 ${TONE_SURFACE[tone]}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          {title && <p className={`font-mono text-fr-label uppercase ${TONE_TEXT[tone]}`}>{title}</p>}
          {children && <div className="mt-1 text-fr-sm leading-relaxed text-muted">{children}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ── Pasek postępu ───────────────────────────────────────────────────────── */
export function Meter({ pct, tone = "primary" }: { pct: number; tone?: Tone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-deep">
      <div
        className={`h-full rounded-full transition-all duration-700 ${TONE_DOT[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
