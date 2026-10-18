import type { ReactNode } from "react";

// Bespoke, jednolity zestaw ikon liniowych (siatka 24, grubość 1.5) —
// zastępuje emoji i generyczne Heroicons. Kolor dziedziczy z currentColor,
// rozmiar ustawiasz klasą (domyślnie h-6 w-6). Renderowane jako inline SVG,
// więc bez dodatkowych żądań sieciowych.

type IconProps = { className?: string };

function Glyph({ className = "h-6 w-6", children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 3c3.2 3.1 4.7 5.4 4.7 8.3a4.7 4.7 0 0 1-9.4 0c0-1.5.6-2.8 1.7-3.9C9.1 8.9 9 10.4 10 11.5c-.4-2.6.6-5.4 2-8.5Z" />
    </Glyph>
  );
}

export function GaugeIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M12 15l4.5-3" />
      <circle cx="12" cy="15" r="1.1" />
    </Glyph>
  );
}

export function ServerIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="4" y="5" width="16" height="6" rx="1" />
      <rect x="4" y="13" width="16" height="6" rx="1" />
      <path d="M7.5 8h.01M7.5 16h.01" />
    </Glyph>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Glyph>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M5 12l5 5L20 7" />
    </Glyph>
  );
}
