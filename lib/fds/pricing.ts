// ─── Model kosztu i ceny zlecenia ────────────────────────────────────────────
//
// Z tych samych stawek korzystają trzy miejsca: planer maszyn (wycena wstępna
// każdego wariantu), webhook zakończenia (cena finalna z realnego zużycia) i
// panel admina (marża). Moduł jest izomorficzny — żadnego dostępu do env ani
// fetcha na poziomie modułu, więc liczy się tak samo w przeglądarce i na serwerze.

import { getSpec } from "@/lib/hetzner/catalog";

export const EUR_PLN = 4.3; // kurs użyty w wycenie

// Hetzner Object Storage (eu-central) + egress na pobranie wyników
export const STORAGE_EUR_PER_GB = 0.031; // €0.0119 storage/m-c + €0.019 egress

// ─── Marża ───────────────────────────────────────────────────────────────────
//
// Cel właściciela: narzut ok. 300% (cena ≈ 4× koszt) w skali portfela, wyższy
// na drobnych zleceniach, niższy na dużych.
//
// Parametry wyznaczone na 99 zakończonych zleceniach FDSRun (stan 2026-09-19,
// koszt maszyn 1 270 zł). Marża jest funkcją surowego kosztu zlecenia, bo koszt
// — inaczej niż liczba komórek — obejmuje jednocześnie wielkość modelu, czas
// liczenia i klasę maszyny:
//
//   zlecenie drobne  (≤ €0,05 ≈ 0,22 zł)  → 6,0×   (narzut 500%)
//   zlecenie typowe  (mediana €1,17 ≈ 5 zł) → 4,6× (narzut 360%)
//   zlecenie duże    (≥ €8,00 ≈ 34 zł)    → 3,8×   (narzut 280%)
//
//   portfelowo na historii biegów: 4,00× = narzut 300% ✔
//
// UWAGA przy strojeniu: portfel jest ważony kosztem, więc o wyniku decydują
// przede wszystkim duże biegi — czyli MARKUP_MIN. Podniesienie samego
// MARKUP_MAX prawie nie rusza realnej marży, a mocno drożą drobne zlecenia.
//
// Czego ta marża NIE pokrywa: maszyn spalonych na zleceniach zakończonych
// błędem (13% kosztu bazy, 185 zł na tej samej historii — nigdy nie fakturowane).
// Z nimi realna krotność spada do ~3,5×. Podgląd w panelu admina liczy to
// osobno, żeby różnica między marżą cennikową a realną była widoczna.
const MARKUP_MAX = 6.0; // zlecenia drobne (zużycie ≤ COST_LO_EUR)
const MARKUP_MIN = 3.8; // zlecenia duże  (zużycie ≥ COST_HI_EUR)
const COST_LO_EUR = 0.05;
const COST_HI_EUR = 8.0;

/** Skrajne wartości marży — do opisu cennika w panelu i w testach. */
export const MARKUP_RANGE = { min: MARKUP_MIN, max: MARKUP_MAX } as const;

/**
 * Cel cennika: narzut 300%, czyli cena = 4× koszt. Do tej linii mierzy się
 * realny wynik w panelu admina — sam cennik jej nie gwarantuje, bo o portfelu
 * decyduje rozkład zleceń i koszt biegów zakończonych błędem.
 */
export const TARGET_MARKUP = 4.0;

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

/** Narzut w procentach (marża 4,0× = 300%) — tak, jak opisuje się go w cenniku. */
export function markupPercent(rawCostEur: number): number {
  return (progressiveMarkup(rawCostEur) - 1) * 100;
}

/**
 * Cena netto w PLN z surowego kosztu chmury i magazynu.
 *
 * Bez sztucznej ceny minimalnej — drobne zlecenie kosztuje tyle, ile wynika
 * z marży, choćby były to grosze (decyzja właściciela). Zaokrąglenie do grosza,
 * bo ta sama kwota trafia na fakturę.
 */
export function priceFromCost(cloudCostEur: number, storageCostEur: number): number {
  const raw = Math.max(0, cloudCostEur) + Math.max(0, storageCostEur);
  const pln = raw * progressiveMarkup(raw) * EUR_PLN;
  // Grosz to najmniejsza kwota, jaką da się zafakturować — poniżej zostaje 0,01.
  return Math.max(0.01, Math.round(pln * 100) / 100);
}

// ─── Rozbicie wyceny ─────────────────────────────────────────────────────────
//
// Jedno miejsce, z którego panel admina i karta zlecenia biorą komplet liczb:
// ile kosztowała maszyna, ile magazyn, jaka marża została zastosowana i ile
// z tego zostaje. Dzięki temu nikt nie mnoży stawek po swojemu.
export interface PriceBreakdown {
  cloudCostEur: number;
  storageCostEur: number;
  rawCostEur: number;
  rawCostPln: number;
  markup: number;
  markupPercent: number;
  price: number;
  /** Zysk brutto na zleceniu [zł] — cena minus koszt. */
  margin: number;
}

export function priceBreakdown(cloudCostEur: number, storageCostEur: number): PriceBreakdown {
  const cloud = Math.max(0, cloudCostEur);
  const storage = Math.max(0, storageCostEur);
  const raw = cloud + storage;
  const price = priceFromCost(cloud, storage);
  const rawPln = raw * EUR_PLN;
  return {
    cloudCostEur: cloud,
    storageCostEur: storage,
    rawCostEur: raw,
    rawCostPln: rawPln,
    markup: progressiveMarkup(raw),
    markupPercent: markupPercent(raw),
    price,
    margin: price - rawPln,
  };
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
  return finalBreakdown(opts).price;
}

/** To samo co `computeFinalPrice`, ale z pełnym rozbiciem — dla admina i maili. */
export function finalBreakdown(opts: {
  serverType: string;
  serverHours: number;
  storageGb: number;
}): PriceBreakdown {
  const spec = getSpec(opts.serverType) ?? getSpec("cpx42")!;
  // realny czas maszyny + krótki narzut na wysłanie wyników i jej usunięcie
  const billedHours = Math.max(1 / 60, opts.serverHours) + 3 / 60;
  return priceBreakdown(billedHours * spec.eurPerHour, Math.max(0, opts.storageGb) * STORAGE_EUR_PER_GB);
}
