"use client";

import { ReactNode } from "react";

// Wspólna warstwa wizualna logowania i rejestracji. Wcześniej obie strony
// niosły własne, prawie identyczne kopie przycisków OAuth, pól, separatora
// i komunikatu błędu — rozjeżdżały się przy każdej zmianie stylu.
// Język wzoru graficznego: ciemna powłoka z siatką, kicker w mono, nagłówek
// Manrope, karta na cienkiej kresce, etykiety jako podpisy przyrządu.

/* ── Powłoka strony ──────────────────────────────────────────────────────── */
export function AuthShell({
  kicker,
  title,
  subtitle,
  aside,
  children,
}: {
  kicker: string;
  title: string;
  subtitle: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative z-10 min-h-[calc(100vh-80px)] overflow-hidden bg-canvas px-4 py-16 md:py-24">
      {/* Tekstura tła — ta sama siatka co w makietach na landingu */}
      <div className="fr-grid pointer-events-none absolute inset-0 opacity-60" />

      <div
        className={`relative mx-auto w-full ${
          aside ? "max-w-[1100px] lg:grid lg:grid-cols-[1fr_460px] lg:gap-16" : "max-w-[460px]"
        }`}
      >
        {aside && <div className="hidden lg:block">{aside}</div>}

        <div className="w-full">
          <div className="mb-8">
            <span className="mb-3 block font-mono text-fr-label uppercase text-muted">{kicker}</span>
            <h1 className="font-heading text-fr-h2 text-ink">{title}</h1>
            <p className="mt-2 text-fr-body text-muted">{subtitle}</p>
          </div>

          <div className="relative rounded-card border border-hairline bg-panel p-6 shadow-fr-panel md:p-8">
            {/* Znaczniki narożników — detal „przyrządowy" ze wzoru */}
            <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t border-hairline" />
            <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 border-r border-t border-hairline" />
            <span className="pointer-events-none absolute bottom-3 left-3 h-2 w-2 border-b border-l border-hairline" />
            <span className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 border-b border-r border-hairline" />

            <div className="space-y-6">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Logowanie przez dostawcę ────────────────────────────────────────────── */
export function OAuthButtons({
  onPick,
  active,
  disabled,
  googleLabel,
  githubLabel,
  redirectingLabel,
}: {
  onPick: (p: "google" | "github") => void;
  active: "google" | "github" | null;
  disabled: boolean;
  googleLabel: string;
  githubLabel: string;
  redirectingLabel: string;
}) {
  const cls =
    "flex w-full items-center justify-center gap-3 rounded-panel border border-hairline bg-panel-deep px-4 py-3 text-fr-body font-medium text-ink transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-2.5">
      <button type="button" onClick={() => onPick("google")} disabled={disabled} className={cls}>
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {active === "google" ? redirectingLabel : googleLabel}
      </button>

      <button type="button" onClick={() => onPick("github")} disabled={disabled} className={cls}>
        <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        {active === "github" ? redirectingLabel : githubLabel}
      </button>
    </div>
  );
}

/* ── Separator „albo e-mailem" ───────────────────────────────────────────── */
export function AuthSeparator({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-hairline-soft" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-panel px-3 font-mono text-fr-label uppercase text-muted">{label}</span>
      </div>
    </div>
  );
}

/* ── Pole formularza ─────────────────────────────────────────────────────── */
export function AuthField({
  id,
  label,
  action,
  ...input
}: {
  id: string;
  label: string;
  action?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="font-mono text-fr-label uppercase text-muted">
          {label}
        </label>
        {action}
      </div>
      <input
        id={id}
        {...input}
        className="w-full rounded-panel border border-hairline bg-panel-deep px-4 py-3 text-fr-body text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

/* ── Komunikat błędu ─────────────────────────────────────────────────────── */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-panel border border-primary/40 bg-primary/[0.07] px-4 py-3 text-fr-sm text-ink"
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {children}
    </div>
  );
}

/* ── Przycisk główny ─────────────────────────────────────────────────────── */
export function AuthSubmit({
  loading,
  disabled,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-panel bg-primary px-4 py-3 text-fr-body font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
