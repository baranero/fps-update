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

export function AirflowIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h14a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h8" />
    </Glyph>
  );
}

export function MeshIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 9h16M4 14h16M9 4v16M14 4v16" />
    </Glyph>
  );
}

export function VentIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M7 8h10M7 12h10M7 16h10" />
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

export function ReportIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M10 13h5M10 16h5" />
    </Glyph>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 3l7 3v5c0 4.6-3.1 7.7-7 9-3.9-1.3-7-4.4-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
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
