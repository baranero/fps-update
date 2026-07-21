// Ostatnia klatka przekroju SLCF (.sf) strumieniowana z maszyny liczącej.
// Pole `data` to base64 tablicy uint8 o długości w*h (row-major), gdzie wiersz 0
// odpowiada DOLNEJ krawędzi osi pionowej (y0). Wartości skwantyzowane liniowo:
//   wartość ≈ vmin + (b / 255) * (vmax - vmin)
// Skwantyzowanie do 256 poziomów wystarcza dla mapy barwnej podglądu, a payload
// pozostaje mały (w*h bajtów) — analogicznie do strumienia CSV DEVC/HRR.

export type Axis = "x" | "y" | "z";

export interface FdsSlice {
  id?: string;      // nazwa pliku .sf (np. "test_1_1.sf") — klucz stabilny do wyboru
  q: string;        // QUANTITY z FDS, np. "TEMPERATURE"
  unit: string;     // jednostka, np. "C"
  short: string;    // krótka nazwa z FDS
  t: number;        // czas symulacji klatki [s]
  w: number;        // szerokość siatki (oś pozioma), po zdownsamplowaniu
  h: number;        // wysokość siatki (oś pionowa), po zdownsamplowaniu
  plane: Axis;      // oś stała przekroju (kierunek normalny)
  pos: number;      // położenie płaszczyzny wzdłuż osi stałej [m] lub w komórkach
  ax: Axis;         // oś pozioma na ekranie
  ay: Axis;         // oś pionowa na ekranie
  x0: number; x1: number; // zakres osi poziomej
  y0: number; y1: number; // zakres osi pionowej
  coords: "m" | "cell";   // czy zakresy są w metrach czy indeksach komórek
  vmin: number; vmax: number;
  data: string;     // base64 uint8[w*h], row-major, wiersz 0 = dół (y0)
}

// Kształt zapisany w kolumnie slice_json: nowy ({slices:[...]}) lub — dla starych
// zleceń — pojedynczy przekrój. `normalizeSlices` sprowadza oba do tablicy.
export type FdsSliceJson = FdsSlice | { slices: FdsSlice[] } | null;

export function normalizeSlices(j: FdsSliceJson | null | undefined): FdsSlice[] {
  if (!j) return [];
  const anyj = j as { slices?: unknown; data?: unknown };
  if (Array.isArray(anyj.slices)) {
    return (anyj.slices as FdsSlice[]).filter((s) => s && typeof s.data === "string" && s.w > 0 && s.h > 0);
  }
  if (typeof anyj.data === "string") return [j as FdsSlice];
  return [];
}

// Dekoduje base64 → Uint8Array o długości w*h. null gdy dane niespójne.
export function decodeSliceData(s: FdsSlice): Uint8Array | null {
  try {
    const bin = atob(s.data);
    const n = s.w * s.h;
    if (bin.length < n || n <= 0) return null;
    const a = new Uint8Array(n);
    for (let i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
    return a;
  } catch {
    return null;
  }
}

// ── Mapa barwna „turbo" ──────────────────────────────────────────────────────
// Percepcyjnie ulepszona tęcza (Google Turbo): zachowuje znany z Smokeview układ
// niebieski→zielony→czerwony, ale bez fałszywych granic „jet". Dla ciągłego pola
// fizycznego (temperatura, widzialność) — konwencja czytelna dla inżynierów ppoż.
const TURBO_STOPS: Array<[number, number, number, number]> = [
  [0.0, 48, 18, 59],
  [0.125, 33, 102, 210],
  [0.25, 30, 168, 224],
  [0.375, 28, 206, 162],
  [0.5, 120, 220, 70],
  [0.625, 200, 220, 40],
  [0.75, 246, 182, 30],
  [0.875, 232, 104, 22],
  [1.0, 158, 20, 18],
];

function buildTurboLut(): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = TURBO_STOPS[0];
    let b = TURBO_STOPS[TURBO_STOPS.length - 1];
    for (let s = 0; s < TURBO_STOPS.length - 1; s++) {
      if (t >= TURBO_STOPS[s][0] && t <= TURBO_STOPS[s + 1][0]) {
        a = TURBO_STOPS[s];
        b = TURBO_STOPS[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = (t - a[0]) / span;
    lut[i * 3] = Math.round(a[1] + (b[1] - a[1]) * f);
    lut[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    lut[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  return lut;
}

export const TURBO_LUT = buildTurboLut();

// Barwa CSS dla znormalizowanej wartości 0..1 (do gradientu paska skali).
export function turboCss(t: number): string {
  const i = Math.max(0, Math.min(255, Math.round(t * 255)));
  return `rgb(${TURBO_LUT[i * 3]}, ${TURBO_LUT[i * 3 + 1]}, ${TURBO_LUT[i * 3 + 2]})`;
}

// Etykieta wielkości fizycznej po polsku (fallback: krótka nazwa / QUANTITY).
export function quantityLabel(q: string, short: string): string {
  const map: Record<string, string> = {
    TEMPERATURE: "Temperatura",
    VISIBILITY: "Widzialność",
    "SOOT VISIBILITY": "Widzialność",
    "SOOT DENSITY": "Stężenie dymu",
    "SOOT MASS FRACTION": "Stężenie dymu",
    "HRRPUV": "HRRPUV (gęstość mocy)",
    VELOCITY: "Prędkość przepływu",
    "U-VELOCITY": "Prędkość (u)",
    "W-VELOCITY": "Prędkość (w)",
    PRESSURE: "Ciśnienie",
    "LAYER HEIGHT": "Wysokość warstwy dymu",
  };
  return map[q.toUpperCase()] ?? short ?? q;
}
