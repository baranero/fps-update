// ─── Realna marża na zleceniach ──────────────────────────────────────────────
//
// Cennik (lib/fds/pricing.ts) mówi, ILE marży zakładamy. Ten moduł liczy, ile
// jej faktycznie zostało — i to na dwa sposoby, bo różnica między nimi jest
// całą istotą sprawy:
//
//   krotność cennikowa  = przychód / koszt maszyn zleceń ZAFAKTUROWANYCH,
//   krotność realna     = przychód / koszt maszyn WSZYSTKICH, więc razem
//                         z biegami zakończonymi błędem, których nikomu nie
//                         obciążamy, a które kosztują dokładnie tyle samo.
//
// Na historii FDSRun (2026-09) błędy to 13% kosztu bazy, czyli różnica między
// 4,0× a 3,5×. Bez tej drugiej liczby panel pokazywałby marżę, której nie ma.
//
// Moduł jest czysty — liczy z wierszy zgłoszeń, bez sięgania do bazy — więc
// korzysta z niego i panel w przeglądarce, i testy.

import { getSpec } from "@/lib/hetzner/catalog";
import { EUR_PLN, STORAGE_EUR_PER_GB, estimateOutputGb, progressiveMarkup } from "./pricing";

/** Minimalny zestaw pól zgłoszenia potrzebny do rozliczenia marży. */
export interface MarginRow {
  status: string;
  server_type: string | null;
  /** Utworzenie maszyny — od tego momentu leci licznik dostawcy. */
  dispatched_at: string | null;
  completed_at: string | null;
  price: number | null;
  total_cells: number | null;
  t_end: number | null;
}

export interface RowCost {
  /** Godziny życia maszyny (dispatched → completed). */
  serverHours: number;
  cloudEur: number;
  storageEur: number;
  rawEur: number;
  costPln: number;
}

/**
 * Koszt pojedynczego zlecenia z realnego czasu życia maszyny. Zwraca null, gdy
 * zlecenie nigdy nie dostało maszyny (nie ma czego rozliczać) albo typ maszyny
 * jest nieznany — zgadywanie zaniżyłoby koszt, a to już raz kosztowało
 * FDSRun 6-krotnie zaniżoną wycenę.
 */
export function rowCost(row: MarginRow): RowCost | null {
  const spec = getSpec(row.server_type);
  if (!spec || !row.dispatched_at || !row.completed_at) return null;

  const ms = new Date(row.completed_at).getTime() - new Date(row.dispatched_at).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const serverHours = ms / 3_600_000;
  const cloudEur = serverHours * spec.eurPerHour;
  // Magazynu nie zapisujemy w bazie — bierzemy tę samą estymatę, na której
  // stoi wycena, więc obie strony rachunku liczą się tak samo.
  const storageEur = estimateOutputGb(row.total_cells ?? 0, row.t_end ?? 300) * STORAGE_EUR_PER_GB;
  const rawEur = cloudEur + storageEur;

  return { serverHours, cloudEur, storageEur, rawEur, costPln: rawEur * EUR_PLN };
}

export interface MarginBucket {
  /** Klucz przedziału — etykietę renderuje warstwa i18n. */
  key: string;
  minCells: number;
  maxCells: number;
  jobs: number;
  revenue: number;
  cost: number;
  margin: number;
  multiplier: number;
}

/** Przedziały wielkości modelu — po nich widać, czy progresja marży działa. */
export const SIZE_BUCKETS: Array<{ key: string; min: number; max: number }> = [
  { key: "xs", min: 0, max: 50_000 },
  { key: "sm", min: 50_000, max: 300_000 },
  { key: "md", min: 300_000, max: 900_000 },
  { key: "lg", min: 900_000, max: 2_000_000 },
  { key: "xl", min: 2_000_000, max: Number.POSITIVE_INFINITY },
];

export interface MarginSummary {
  /** Przychód ze zleceń zakończonych [zł]. */
  revenue: number;
  /** Koszt maszyn zleceń zafakturowanych [zł]. */
  costBilled: number;
  /** Koszt maszyn zleceń, za które nikt nie zapłacił (błędy, anulowane) [zł]. */
  costBurned: number;
  /** Zysk brutto liczony po koszcie całkowitym [zł]. */
  margin: number;
  /** Przychód / koszt zafakturowanych — to widać w cenniku. */
  multiplier: number;
  /** Przychód / koszt całkowity — to zostaje realnie. */
  realizedMultiplier: number;
  /** Udział kosztu spalonego w koszcie całkowitym [0–1]. */
  burnShare: number;
  billedJobs: number;
  burnedJobs: number;
  buckets: MarginBucket[];
}

const EMPTY: MarginSummary = {
  revenue: 0, costBilled: 0, costBurned: 0, margin: 0,
  multiplier: 0, realizedMultiplier: 0, burnShare: 0,
  billedJobs: 0, burnedJobs: 0, buckets: [],
};

export function summarizeMargin(rows: MarginRow[]): MarginSummary {
  let revenue = 0;
  let costBilled = 0;
  let costBurned = 0;
  let billedJobs = 0;
  let burnedJobs = 0;

  const byBucket = new Map<string, MarginBucket>(
    SIZE_BUCKETS.map((b) => [
      b.key,
      { key: b.key, minCells: b.min, maxCells: b.max, jobs: 0, revenue: 0, cost: 0, margin: 0, multiplier: 0 },
    ])
  );

  for (const row of rows) {
    const cost = rowCost(row);
    if (!cost) continue;

    if (row.status === "done") {
      const price = row.price ?? 0;
      revenue += price;
      costBilled += cost.costPln;
      billedJobs++;

      const cells = row.total_cells ?? 0;
      const bucket = SIZE_BUCKETS.find((b) => cells >= b.min && cells < b.max);
      if (bucket) {
        const acc = byBucket.get(bucket.key)!;
        acc.jobs++;
        acc.revenue += price;
        acc.cost += cost.costPln;
      }
    } else {
      // Anulowane i błędne zlecenia też zużyły maszynę — i nikt za nią nie zapłacił.
      costBurned += cost.costPln;
      burnedJobs++;
    }
  }

  if (billedJobs === 0 && burnedJobs === 0) return EMPTY;

  const costTotal = costBilled + costBurned;
  const buckets = Array.from(byBucket.values())
    .filter((b) => b.jobs > 0)
    .map((b) => ({ ...b, margin: b.revenue - b.cost, multiplier: b.cost > 0 ? b.revenue / b.cost : 0 }));

  return {
    revenue,
    costBilled,
    costBurned,
    margin: revenue - costTotal,
    multiplier: costBilled > 0 ? revenue / costBilled : 0,
    realizedMultiplier: costTotal > 0 ? revenue / costTotal : 0,
    burnShare: costTotal > 0 ? costBurned / costTotal : 0,
    billedJobs,
    burnedJobs,
    buckets,
  };
}

/**
 * Ile zlecenie kosztowałoby DZIŚ, według obowiązującego cennika. Porównanie
 * z ceną faktycznie pobraną pokazuje, czy historyczne stawki trzymały się
 * modelu — i o ile zmieni się przychód po zmianie marży.
 */
export function priceAtCurrentTariff(row: MarginRow): number | null {
  const cost = rowCost(row);
  if (!cost) return null;
  return Math.max(0.01, Math.round(cost.rawEur * progressiveMarkup(cost.rawEur) * EUR_PLN * 100) / 100);
}
