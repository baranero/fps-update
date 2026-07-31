// Tony akcentów systemu FDSRun — warstwa koloru wspólna dla chipów, komunikatów
// i kropek stanu. Trzymane w `lib`, a nie w komponencie, żeby mogły z nich
// korzystać zarówno prymitywy UI („use client"), jak i czyste moduły danych
// (np. `lib/status.ts`), bez wciągania Reacta na serwer.
//
// Klasy są wypisane w całości, nie sklejane — Tailwind skanuje literały.

export type Tone = "ink" | "muted" | "primary" | "signal" | "warn" | "ok";

export const TONE_CHIP: Record<Tone, string> = {
  ink: "border-hairline bg-panel-deep text-ink",
  muted: "border-hairline-soft bg-panel-deep text-muted",
  primary: "border-primary/30 bg-primary/10 text-primary",
  signal: "border-signal/30 bg-signal/10 text-signal",
  warn: "border-warn/30 bg-warn/10 text-warn",
  ok: "border-ok/30 bg-ok/10 text-ok",
};

export const TONE_TEXT: Record<Tone, string> = {
  ink: "text-ink",
  muted: "text-muted",
  primary: "text-primary",
  signal: "text-signal",
  warn: "text-warn",
  ok: "text-ok",
};

export const TONE_DOT: Record<Tone, string> = {
  ink: "bg-ink",
  muted: "bg-muted",
  primary: "bg-primary",
  signal: "bg-signal",
  warn: "bg-warn",
  ok: "bg-ok",
};

export const TONE_SURFACE: Record<Tone, string> = {
  ink: "border-hairline bg-panel-deep",
  muted: "border-hairline-soft bg-panel-deep",
  primary: "border-primary/30 bg-primary/[0.06]",
  signal: "border-signal/30 bg-signal/[0.06]",
  warn: "border-warn/30 bg-warn/[0.06]",
  ok: "border-ok/30 bg-ok/[0.06]",
};

// Geometria chipa stanu — ta sama dla statusu zlecenia, formatu raportu
// i znacznika płatności. Zmiana tutaj przechodzi na cały serwis.
export const CHIP_SHAPE =
  "inline-flex shrink-0 items-center gap-1.5 rounded-chip border px-2 py-0.5 font-mono text-fr-micro uppercase";

export function chipCls(tone: Tone, extra = ""): string {
  return `${CHIP_SHAPE} ${TONE_CHIP[tone]} ${extra}`.trim();
}
