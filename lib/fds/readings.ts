// ─── Kluczowe odczyty z wyników FDS ──────────────────────────────────────────
//
// Projektant nie czyta pulpitu po to, żeby zobaczyć krok czasowy solvera —
// czeka na LICZBY, które trafią do opracowania: maksimum mocy pożaru, najwyższą
// temperaturę pod stropem, najmniejszą widzialność na drodze ewakuacyjnej.
// Wykres pokazuje przebieg, ale wartość skrajną trzeba z niego wypatrzeć; tu
// jest podana wprost, razem z chwilą, w której wystąpiła.
//
// Świadomie BEZ progu i bez oceny „spełnia / nie spełnia" — to decyzja klienta
// z lipca 2026: podajemy przebiegi i odczyty, kryterium ocenia projektant.

import type { FdsCsvData } from "./devc";
import type { FdsDevc } from "./parser";

export interface FdsReading {
  /** ID urządzenia DEVC albo nazwa serii (np. „HRR”). */
  id: string;
  /** Która skrajność jest dla tej wielkości istotna. */
  kind: "max" | "min";
  value: number;
  unit: string;
  /** Czas symulacji [s], w którym wartość wystąpiła; null gdy brak osi czasu. */
  time: number | null;
}

// Wielkości, dla których niebezpieczna jest wartość NAJMNIEJSZA: widzialność
// spada w dymie, tlen się wyczerpuje, warstwa dymu opada. Dla całej reszty
// (temperatura, moc, ciśnienie, prędkość) istotne jest maksimum — i to jest
// domyślne zachowanie, gdy wielkości nie da się rozpoznać.
const MIN_QUANTITY = /visibilit|oxygen|layer\s*height/i;
const MIN_NAME = /visib|widzialn/i;

function extremumKind(id: string, quantity: string | null | undefined): "max" | "min" {
  if (quantity) return MIN_QUANTITY.test(quantity) ? "min" : "max";
  return MIN_NAME.test(id) ? "min" : "max";
}

function extremum(
  values: number[],
  time: number[],
  kind: "max" | "min"
): { value: number; time: number | null } | null {
  let best = NaN;
  let at: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue; // FDS potrafi zapisać NaN w trakcie biegu
    if (!Number.isFinite(best) || (kind === "max" ? v > best : v < best)) {
      best = v;
      at = time[i] ?? null;
    }
  }
  return Number.isFinite(best) ? { value: best, time: at } : null;
}

/**
 * Skrajne wartości serii wynikowych — HRR na pierwszym miejscu (moc pożaru to
 * odczyt, od którego zaczyna się każda analiza), dalej urządzenia DEVC w
 * kolejności z pliku .fds, bo ta kolejność odzwierciedla priorytet autora modelu.
 */
export function keyReadings(
  hrr: FdsCsvData | null,
  devc: FdsCsvData | null,
  setpoints: FdsDevc[] | null | undefined,
  max = 4
): FdsReading[] {
  const out: FdsReading[] = [];

  const hrrSeries = hrr?.series.find((s) => /^hrr$/i.test(s.name)) ?? hrr?.series[0];
  if (hrr && hrrSeries) {
    const ext = extremum(hrrSeries.values, hrr.time, "max");
    if (ext) out.push({ id: hrrSeries.name, kind: "max", value: ext.value, unit: hrrSeries.unit || "kW", time: ext.time });
  }

  const quantityById = new Map(
    (setpoints ?? []).map((d) => [d.id.trim().toLowerCase(), d.quantity] as const)
  );

  for (const s of devc?.series ?? []) {
    if (out.length >= max) break;
    const kind = extremumKind(s.name, quantityById.get(s.name.trim().toLowerCase()));
    const ext = extremum(s.values, devc!.time, kind);
    if (!ext) continue;
    out.push({ id: s.name, kind, value: ext.value, unit: s.unit, time: ext.time });
  }

  return out.slice(0, max);
}

/** Zapis wartości odczytu — tyle miejsc po przecinku, ile wnosi informację. */
export function formatReading(v: number, locale: string): string {
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
