// ─── Katalog maszyn obliczeniowych ───────────────────────────────────────────
//
// Jedno źródło prawdy o dostępnym sprzęcie: parametry, cena i wydajność.
// Moduł jest izomorficzny (żadnego dostępu do env ani fetcha na poziomie modułu),
// więc kreator może z niego liczyć wycenę w przeglądarce, a API — po stronie
// serwera. Odpytanie żywej dostępności/cennika siedzi w `client.ts`.
//
// Ceny: netto EUR/h, lokalizacja nbg1, stan z API Hetznera (sierpień 2026).
// Traktujemy je jako wartość zapasową — `fetchLiveCatalog()` nadpisuje je
// aktualnymi, więc podwyżka u dostawcy nie wymaga wdrożenia.

export type ServerFamily = "cx" | "cpx" | "ccx";

export interface ServerSpec {
  type: string;
  family: ServerFamily;
  cores: number;
  ramGb: number;
  diskGb: number;
  eurPerHour: number;
  dedicated: boolean;
}

// Aktualne generacje x86. ARM (CAX) świadomie pominięte — dystrybuowana binarka
// FDS to Linux x86_64, na Ampere nie wystartuje.
export const SERVER_CATALOG: ServerSpec[] = [
  // Ekonomiczne, starsza generacja sprzętu, zmienna wydajność ("limited availability")
  { type: "cx23", family: "cx", cores: 2, ramGb: 4, diskGb: 40, eurPerHour: 0.0088, dedicated: false },
  { type: "cx33", family: "cx", cores: 4, ramGb: 8, diskGb: 80, eurPerHour: 0.0136, dedicated: false },
  { type: "cx43", family: "cx", cores: 8, ramGb: 16, diskGb: 160, eurPerHour: 0.0256, dedicated: false },
  { type: "cx53", family: "cx", cores: 16, ramGb: 32, diskGb: 320, eurPerHour: 0.0473, dedicated: false },

  // Standard — współdzielone rdzenie na nowszym sprzęcie
  { type: "cpx12", family: "cpx", cores: 1, ramGb: 2, diskGb: 40, eurPerHour: 0.0184, dedicated: false },
  { type: "cpx22", family: "cpx", cores: 2, ramGb: 4, diskGb: 80, eurPerHour: 0.0312, dedicated: false },
  { type: "cpx32", family: "cpx", cores: 4, ramGb: 8, diskGb: 160, eurPerHour: 0.0569, dedicated: false },
  { type: "cpx42", family: "cpx", cores: 8, ramGb: 16, diskGb: 320, eurPerHour: 0.1114, dedicated: false },
  { type: "cpx52", family: "cpx", cores: 12, ramGb: 24, diskGb: 480, eurPerHour: 0.1610, dedicated: false },
  { type: "cpx62", family: "cpx", cores: 16, ramGb: 32, diskGb: 640, eurPerHour: 0.2083, dedicated: false },

  // Dedykowane vCPU — przewidywalna wydajność, jedyna droga powyżej 16 rdzeni
  { type: "ccx13", family: "ccx", cores: 2, ramGb: 8, diskGb: 80, eurPerHour: 0.0689, dedicated: true },
  { type: "ccx23", family: "ccx", cores: 4, ramGb: 16, diskGb: 160, eurPerHour: 0.1378, dedicated: true },
  { type: "ccx33", family: "ccx", cores: 8, ramGb: 32, diskGb: 240, eurPerHour: 0.2219, dedicated: true },
  { type: "ccx43", family: "ccx", cores: 16, ramGb: 64, diskGb: 360, eurPerHour: 0.4423, dedicated: true },
  { type: "ccx53", family: "ccx", cores: 32, ramGb: 128, diskGb: 600, eurPerHour: 0.8550, dedicated: true },
  { type: "ccx63", family: "ccx", cores: 48, ramGb: 192, diskGb: 960, eurPerHour: 1.3678, dedicated: true },
];

// Wycofane typy, na których liczyły starsze zlecenia. Nie da się już na nich
// niczego uruchomić, ale historia i rozliczenia muszą je umieć wyświetlić.
const LEGACY_CATALOG: ServerSpec[] = [
  { type: "cpx11", family: "cpx", cores: 2, ramGb: 2, diskGb: 40, eurPerHour: 0.0088, dedicated: false },
  { type: "cpx21", family: "cpx", cores: 3, ramGb: 4, diskGb: 80, eurPerHour: 0.0152, dedicated: false },
  { type: "cpx31", family: "cpx", cores: 4, ramGb: 8, diskGb: 160, eurPerHour: 0.0280, dedicated: false },
  { type: "cpx41", family: "cpx", cores: 8, ramGb: 16, diskGb: 240, eurPerHour: 0.0521, dedicated: false },
  { type: "cpx51", family: "cpx", cores: 16, ramGb: 32, diskGb: 360, eurPerHour: 0.1138, dedicated: false },
  { type: "cx22", family: "cx", cores: 2, ramGb: 4, diskGb: 40, eurPerHour: 0.0060, dedicated: false },
  { type: "cx32", family: "cx", cores: 4, ramGb: 8, diskGb: 80, eurPerHour: 0.0110, dedicated: false },
  { type: "cx42", family: "cx", cores: 8, ramGb: 16, diskGb: 160, eurPerHour: 0.0230, dedicated: false },
  { type: "cx52", family: "cx", cores: 16, ramGb: 32, diskGb: 320, eurPerHour: 0.0440, dedicated: false },
];

const BY_TYPE = new Map<string, ServerSpec>(
  [...SERVER_CATALOG, ...LEGACY_CATALOG].map((s) => [s.type, s])
);

export function getSpec(type: string | null | undefined): ServerSpec | null {
  if (!type) return null;
  return BY_TYPE.get(type.toLowerCase()) ?? null;
}

// ─── Wydajność rdzenia ───────────────────────────────────────────────────────
//
// `throughput` = cell-timesteps na sekundę na jeden proces MPI, gdy proces jest
// na maszynie sam. `contention` opisuje spadek tej wartości przy kolejnych
// procesach na tej samej maszynie (współdzielona magistrala pamięci):
//
//   wydajność(n) = throughput / (1 + contention × (n − 1))
//
// Liczby pochodzą z realnych biegów FDSRun (patrz lib/fds/calibration.ts —
// wartości są nadpisywane, gdy w historii uzbiera się dość próbek):
//   cpx12, 1 proces  → 332 000 … 372 000 ct/s   (mediana 335 600)
//   cpx62, 16 proc.  → 167 000 … 243 000 ct/s   (mediana 178 000)
//     → 335 600 / 178 000 = 1,89 = 1 + contention × 15  ⇒ contention ≈ 0,059
//   cx23,  1 proces  → 115 300 ct/s             (0,34 × cpx — starszy sprzęt)
export interface FamilyPerf {
  throughput: number;
  contention: number;
  /** true = brak własnych pomiarów, wartość oszacowana z pokrewnej rodziny */
  estimated: boolean;
}

export const FAMILY_PERF: Record<ServerFamily, FamilyPerf> = {
  cpx: { throughput: 335_000, contention: 0.059, estimated: false },
  cx: { throughput: 115_000, contention: 0.059, estimated: false },
  // Rdzenie dedykowane: bez „kradzieży" czasu przez sąsiadów, więc zakładamy
  // nieco wyższą i stabilniejszą wydajność niż na współdzielonych. Do czasu
  // pierwszego biegu na CCX to jedyna pozycja bez pomiaru.
  ccx: { throughput: 360_000, contention: 0.050, estimated: true },
};

/** Wydajność jednego procesu MPI przy `procs` procesach na maszynie. */
export function perProcThroughput(family: ServerFamily, procs: number, perf = FAMILY_PERF): number {
  const p = perf[family];
  return p.throughput / (1 + p.contention * Math.max(0, procs - 1));
}

// ─── Etykiety ────────────────────────────────────────────────────────────────
//
// Klient nie ogląda symboli maszyn dostawcy (zasada copy FDSRun) — dostaje
// liczbę rdzeni i pamięci. Symbol typu zostaje w panelu admina.
export function serverLabel(type: string | null): { cores: number | null; label: string } {
  const spec = getSpec(type);
  if (!spec) return { cores: null, label: type ? type.toUpperCase() : "—" };
  return { cores: spec.cores, label: `${spec.cores} vCPU · ${spec.ramGb} GB RAM` };
}
