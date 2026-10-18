// ─── Analiza wyników pod raport (CNBOP-PIB W-0003:2016, rozdz. 7) ───────────
//
// Liczby, które projektant przepisuje do opracowania: kiedy transmitancja
// w punkcie pomiarowym wróciła do progu po uruchomieniu systemu, ile trwało
// oddymianie, jakie były strumienie przez klapy i kompensację, jaka moc źródła.
//
// ŚWIADOMIE BEZ WERDYKTU (decyzja właściciela, 2026-10): podajemy wartości
// i parametry, przy których je wyznaczono; ocenę „spełnia / nie spełnia”
// formułuje projektant. Próg i chwila aktywacji są parametrami, nie stałymi.
//
// Niepewność modelu — metoda z FDS Validation Guide (NIST SP 1018-3, rozdz. 4):
// wartość rzeczywista ~ N(M/δ, σ̃·M/δ). Dla przesłonięcia dymem wielkością
// modelowaną jest dopełnienie transmitancji (100 − T), stąd przeliczenia progów.

import type { FdsCsvData } from "./devc";
import type { FdsDevc } from "./parser";

export interface AnalysisParams {
  /** Chwila uruchomienia systemu [s] — wytyczne p. 7.3.3: 360 s. */
  activation: number;
  /** Próg transmitancji [%/m] — wytyczne p. 7.3.6: 95 %/m. */
  threshold: number;
  /** Współczynnik obciążenia modelu dla przesłonięcia dymem (δ). */
  delta: number;
  /** Względne odchylenie standardowe modelu dla przesłonięcia dymem (σ̃). */
  sigma: number;
}

/** Statystyki FDS 6.11 Validation Guide, tab. 16.1 — przesłonięcie dymem. */
export const DEFAULT_PARAMS: AnalysisParams = { activation: 360, threshold: 95, delta: 1.24, sigma: 0.26 };

/** Ta sama metoda dla prędkości przepływu (strumienie) — tab. 16.1. */
export const FLOW_UNCERTAINTY = { delta: 1.07, sigma: 0.25 } as const;

export type SeriesKind = "transmission" | "obscuration" | "flow" | "other";

export interface BelowPeriod {
  from: number;
  /** null = do końca zapisu. */
  to: number | null;
}

export interface TransmissionResult {
  id: string;
  kind: "transmission" | "obscuration";
  /** Minimum transmitancji [%/m] i jego chwila. */
  min: { value: number; t: number } | null;
  /** Okresy, w których T < próg. */
  below: BelowPeriod[];
  /**
   * Pierwsze osiągnięcie progu po aktywacji (reguła z raportu: pierwsza chwila
   * t ≥ aktywacja, w której T ≥ próg, po okresie poniżej progu).
   * `null` gdy nie osiągnięto do końca zapisu; `"never_below"` gdy przebieg
   * w ogóle nie spadł poniżej progu.
   */
  reach: number | null | "never_below";
  /** Od kiedy T ≥ próg nieprzerwanie do końca zapisu (null = nie utrzymało się). */
  reachStable: number | null;
  /** Ostatnia wartość [%/m]. */
  last: { value: number; t: number } | null;
}

export interface FlowResult {
  id: string;
  unit: string;
  /** Średnia po aktywacji [m³/s] (znak jak w modelu). */
  meanAfter: number | null;
  /** Objętość przepływu po aktywacji [m³] — całka trapezami. */
  volumeAfter: number | null;
  /** Wartość rzeczywista wg Validation Guide: średnia/δ ± σ̃·|średnia|/δ. */
  real: { mean: number; sd: number } | null;
}

export interface HrrResult {
  max: { value: number; t: number };
  /** Średnia z fazy ustalonej (wartości ≥ 90% maksimum) [kW]. */
  plateau: number;
  /** Energia wydzielona [MJ]. */
  energyMJ: number;
}

export interface UncertaintyRow {
  key: "expected" | "criterion" | "conf2s";
  /** Próg w wyniku modelu [%/m], któremu odpowiada dany poziom. */
  modelThreshold: number;
  /** Prawdopodobieństwo, że rzeczywista T ≥ próg, gdy model pokazuje modelThreshold. */
  confidence: number;
  /** Miarodajny czas osiągnięcia (późniejszy z wybranych torów) [s]. */
  reach: number | null;
  /** Czas oddymiania od aktywacji [s]. */
  tOdd: number | null;
}

export interface Analysis {
  params: AnalysisParams;
  transmission: TransmissionResult[];
  /** Wynik dla punktu pomiarowego złożonego z wybranych torów. */
  point: {
    ids: string[];
    reach: number | null;
    tOdd: number | null;
    /** true gdy któryś tor nie spadł poniżej progu (nie ma czego oddymiać). */
    someNeverBelow: boolean;
  };
  uncertainty: UncertaintyRow[];
  flows: FlowResult[];
  hrr: HrrResult | null;
  /** Czas ostatniego zapisu [s]. */
  tEndData: number | null;
}

// ── Rozpoznanie wielkości ────────────────────────────────────────────────────

export function classifySeries(
  name: string,
  unit: string,
  values: number[],
  quantity: string | null | undefined
): SeriesKind {
  if (quantity) {
    if (/TRANSMISSION/i.test(quantity)) return "transmission";
    if (/OBSCURATION/i.test(quantity)) return "obscuration";
    if (/VOLUME\s*FLOW/i.test(quantity)) return "flow";
    return "other";
  }
  const u = unit.replace(/\s/g, "").toLowerCase();
  if (u === "m3/s") return "flow";
  if (u === "%/m") {
    if (/obsc|zaciem/i.test(name)) return "obscuration";
    if (/trans/i.test(name)) return "transmission";
    // Bez nazwy rozstrzyga stan początkowy: czysta klatka to T≈100 albo O≈0.
    const first = values.find((v) => Number.isFinite(v));
    return first != null && first < 50 ? "obscuration" : "transmission";
  }
  return "other";
}

// ── Transmitancja ────────────────────────────────────────────────────────────

function reachTime(time: number[], T: number[], thr: number, activation: number): number | null | "never_below" {
  let everBelow = false;
  for (let i = 0; i < T.length; i++) {
    if (Number.isFinite(T[i]) && T[i] < thr) { everBelow = true; break; }
  }
  if (!everBelow) return "never_below";
  // Pierwsza chwila po aktywacji z T ≥ próg, poprzedzona okresem poniżej progu.
  let wasBelow = false;
  for (let i = 0; i < T.length; i++) {
    const v = T[i];
    if (!Number.isFinite(v)) continue;
    if (v < thr) { wasBelow = true; continue; }
    if (wasBelow && time[i] >= activation) return time[i];
  }
  return null;
}

function analyzeTransmission(
  id: string,
  kind: "transmission" | "obscuration",
  time: number[],
  raw: number[],
  p: AnalysisParams,
  thr = p.threshold
): TransmissionResult {
  const T = kind === "obscuration" ? raw.map((v) => 100 - v) : raw;
  let min: TransmissionResult["min"] = null;
  let last: TransmissionResult["last"] = null;
  const below: BelowPeriod[] = [];
  let open: number | null = null;
  for (let i = 0; i < T.length; i++) {
    const v = T[i];
    if (!Number.isFinite(v)) continue;
    if (!min || v < min.value) min = { value: v, t: time[i] };
    last = { value: v, t: time[i] };
    if (v < thr && open == null) open = time[i];
    if (v >= thr && open != null) { below.push({ from: open, to: time[i] }); open = null; }
  }
  if (open != null) below.push({ from: open, to: null });
  const lastPeriod = below[below.length - 1];
  const reachStable = !below.length ? null : lastPeriod.to;
  return { id, kind, min, below, reach: reachTime(time, T, thr, p.activation), reachStable, last };
}

// ── Strumienie i moc ─────────────────────────────────────────────────────────

function flowResult(id: string, unit: string, time: number[], v: number[], activation: number): FlowResult {
  let sum = 0, n = 0, vol = 0;
  for (let i = 0; i < v.length; i++) {
    if (!Number.isFinite(v[i]) || time[i] < activation) continue;
    sum += v[i]; n++;
    const j = i - 1;
    if (j >= 0 && time[j] >= activation && Number.isFinite(v[j])) {
      vol += ((v[i] + v[j]) / 2) * (time[i] - time[j]);
    }
  }
  const meanAfter = n ? sum / n : null;
  return {
    id, unit,
    meanAfter,
    volumeAfter: n > 1 ? vol : null,
    real: meanAfter == null ? null : {
      mean: meanAfter / FLOW_UNCERTAINTY.delta,
      sd: (FLOW_UNCERTAINTY.sigma * Math.abs(meanAfter)) / FLOW_UNCERTAINTY.delta,
    },
  };
}

function hrrResult(hrr: FdsCsvData | null): HrrResult | null {
  const s = hrr?.series.find((x) => x.name.toUpperCase() === "HRR");
  if (!hrr || !s) return null;
  let max: HrrResult["max"] | null = null;
  let energy = 0;
  for (let i = 0; i < s.values.length; i++) {
    const v = s.values[i];
    if (!Number.isFinite(v)) continue;
    if (!max || v > max.value) max = { value: v, t: hrr.time[i] };
    if (i > 0 && Number.isFinite(s.values[i - 1])) {
      energy += ((v + s.values[i - 1]) / 2) * (hrr.time[i] - hrr.time[i - 1]);
    }
  }
  if (!max || max.value <= 0) return null;
  const plateauVals = s.values.filter((v) => Number.isFinite(v) && v >= 0.9 * max!.value);
  const plateau = plateauVals.reduce((a, b) => a + b, 0) / plateauVals.length;
  return { max, plateau, energyMJ: energy / 1000 };
}

// ── Niepewność ───────────────────────────────────────────────────────────────

/** Dystrybuanta rozkładu normalnego (Abramowitz–Stegun 7.1.26). */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/**
 * Próg w wyniku modelu, przy którym rzeczywista transmitancja osiąga próg
 * kryterium z zadaną pewnością. O_mod = (100 − T_mod); O_real ~ N(O_mod/δ, σ̃·O_mod/δ).
 *  - wartość oczekiwana:   O_mod/δ = O_thr            → T_mod = 100 − O_thr·δ
 *  - 2σ (97,7%):           O_mod/δ·(1 + 2σ̃) = O_thr  → T_mod = 100 − O_thr·δ/(1 + 2σ̃)
 *  - samo kryterium:       T_mod = próg, pewność Φ((δ − 1)/σ̃)
 */
export function uncertaintyThresholds(p: AnalysisParams) {
  const oThr = 100 - p.threshold;
  return {
    expected: 100 - oThr * p.delta,
    criterion: p.threshold,
    conf2s: 100 - (oThr * p.delta) / (1 + 2 * p.sigma),
    criterionConfidence: normCdf((p.delta - 1) / p.sigma),
  };
}

// ── Całość ───────────────────────────────────────────────────────────────────

export function analyze(
  devc: FdsCsvData | null,
  hrr: FdsCsvData | null,
  devcs: FdsDevc[] | null,
  p: AnalysisParams,
  pointIds?: string[]
): Analysis {
  const qty = new Map((devcs ?? []).map((d) => [d.id, d.quantity]));
  const transmission: TransmissionResult[] = [];
  const flows: FlowResult[] = [];
  const raws = new Map<string, { kind: "transmission" | "obscuration"; values: number[] }>();

  for (const s of devc?.series ?? []) {
    const kind = classifySeries(s.name, s.unit, s.values, qty.get(s.name));
    if (kind === "transmission" || kind === "obscuration") {
      transmission.push(analyzeTransmission(s.name, kind, devc!.time, s.values, p));
      raws.set(s.name, { kind, values: s.values });
    } else if (kind === "flow") {
      flows.push(flowResult(s.name, s.unit, devc!.time, s.values, p.activation));
    }
  }

  const ids = (pointIds ?? []).filter((id) => raws.has(id));
  const pointFor = (thr: number) => {
    let reach: number | null = -Infinity;
    let neverBelow = false;
    for (const id of ids) {
      const r = raws.get(id)!;
      const res = analyzeTransmission(id, r.kind, devc!.time, r.values, p, thr).reach;
      if (res === "never_below") { neverBelow = true; continue; }
      if (res == null) { reach = null; break; }
      reach = Math.max(reach as number, res);
    }
    const value = reach === -Infinity ? null : reach;
    return { reach: value, tOdd: value == null ? null : value - p.activation, neverBelow };
  };

  const main = pointFor(p.threshold);
  const th = uncertaintyThresholds(p);
  const uncertainty: UncertaintyRow[] = ids.length
    ? ([
        ["expected", th.expected, 0.5],
        ["criterion", th.criterion, th.criterionConfidence],
        ["conf2s", th.conf2s, normCdf(2)],
      ] as const).map(([key, thr, conf]) => {
        const r = pointFor(thr);
        return { key, modelThreshold: thr, confidence: conf, reach: r.reach, tOdd: r.tOdd };
      })
    : [];

  return {
    params: p,
    transmission,
    point: { ids, reach: main.reach, tOdd: main.tOdd, someNeverBelow: main.neverBelow },
    uncertainty,
    flows,
    hrr: hrrResult(hrr),
    tEndData: devc?.time.length ? devc.time[devc.time.length - 1] : null,
  };
}

/** Rzeczywista transmitancja odpowiadająca wynikowi modelu (do opisu stanu końcowego). */
export function realTransmission(tModel: number, p: AnalysisParams) {
  const o = (100 - tModel) / p.delta;
  return { mean: 100 - o, sd: p.sigma * o };
}
