// ─── Model kosztu zlecenia ───────────────────────────────────────────────────
//
// Wydzielone z parser.ts, bo z tych samych stawek korzystają teraz trzy miejsca:
// planer maszyn (wycena wstępna każdego wariantu), webhook zakończenia (cena
// finalna z realnego zużycia) i panel admina (marża). Moduł jest izomorficzny.

import { getSpec } from "@/lib/hetzner/catalog";

export const EUR_PLN = 4.3; // kurs użyty w wycenie

// Hetzner Object Storage (eu-central) + egress na pobranie wyników
export const STORAGE_EUR_PER_GB = 0.031; // €0.0119 storage/m-c + €0.019 egress

// Progresywna marża: wysoka na drobnych zleceniach, malejąca wraz ze wzrostem
// zużycia. MARKUP_MIN = dotychczasowe 10× — duże zlecenia nie drożeją względem
// poprzedniego cennika.
const MARKUP_MAX = 25; // małe zlecenia (zużycie ≤ COST_LO_EUR)
const MARKUP_MIN = 10; // duże zlecenia (zużycie ≥ COST_HI_EUR)
const COST_LO_EUR = 0.05;
const COST_HI_EUR = 3.0;

/** ~10 min: boot maszyny + wysyłka wyników + auto-usunięcie. */
export const OVERHEAD_H = 10 / 60;

export function estimateOutputGb(cells: number, tEnd: number): number {
  // ~0.3 GB na milion komórek na minutę symulacji (przekroje + csv + smv)
  return Math.max(0.05, (cells / 1_000_000) * 0.3 * (tEnd / 60));
}

/** Marża w funkcji realnego zużycia — log-interpolacja, bez skoków na progach. */
export function progressiveMarkup(rawCostEur: number): number {
  if (rawCostEur <= COST_LO_EUR) return MARKUP_MAX;
  if (rawCostEur >= COST_HI_EUR) return MARKUP_MIN;
  const t = Math.log(rawCostEur / COST_LO_EUR) / Math.log(COST_HI_EUR / COST_LO_EUR);
  return MARKUP_MAX - (MARKUP_MAX - MARKUP_MIN) * t;
}

/** Cena netto w PLN z surowego kosztu chmury i magazynu. */
export function priceFromCost(cloudCostEur: number, storageCostEur: number): number {
  const raw = cloudCostEur + storageCostEur;
  return Math.max(1, Math.round(raw * progressiveMarkup(raw) * EUR_PLN));
}

// ─── Finalna cena po zakończeniu obliczeń ────────────────────────────────────
//
// Realny czas życia maszyny × stawka godzinowa + faktyczny rozmiar wyników,
// z tą samą marżą co wycena wstępna.
export function computeFinalPrice(opts: {
  serverType: string;
  serverHours: number;
  storageGb: number;
}): number {
  const spec = getSpec(opts.serverType) ?? getSpec("cpx42")!;
  // realny czas maszyny + krótki narzut na wysłanie wyników i jej usunięcie
  const billedHours = Math.max(1 / 60, opts.serverHours) + 3 / 60;
  return priceFromCost(billedHours * spec.eurPerHour, Math.max(0, opts.storageGb) * STORAGE_EUR_PER_GB);
}
