// Parser plików wynikowych FDS w formacie CSV (CHID_devc.csv, CHID_hrr.csv).
// Format FDS:
//   linia 0: jednostki   →  s,%,C,kW
//   linia 1: nagłówki     →  Time,"BEAM_1","TC_1","HRR"
//   linia 2+: dane        →  0.000000E+00,1.23E+00,...
// Pierwsza kolumna to zawsze czas (Time). Nagłówki bywają w cudzysłowach.

import type { FdsDevc } from "./parser";

export interface FdsCsvSeries {
  name: string;
  unit: string;
  values: number[]; // NaN dozwolone (np. "NaN" z FDS) — wykres zrobi przerwę
}

export interface FdsCsvData {
  time: number[];
  series: FdsCsvSeries[];
}

export interface DevcActivation {
  id: string;
  quantity: string | null;
  setpoint: number;
  tActivated: number | null; // s; null gdy nie zadziałało w dostępnych danych
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Wspólny parser dla devc.csv i hrr.csv (identyczny format).
export function parseFdsCsv(text: string | null | undefined): FdsCsvData | null {
  if (!text) return null;
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 3) return null; // jednostki + nagłówki + min. 1 wiersz danych

  const units = splitCsvLine(lines[0]);
  const headers = splitCsvLine(lines[1]);
  const nCols = headers.length;
  if (nCols < 2) return null;

  const time: number[] = [];
  const cols: number[][] = Array.from({ length: nCols - 1 }, () => []);

  for (let r = 2; r < lines.length; r++) {
    const fields = splitCsvLine(lines[r]);
    if (fields.length < nCols) continue; // niekompletny wiersz (np. w trakcie strumienia)
    const t = parseFloat(fields[0]);
    if (isNaN(t)) continue;
    time.push(t);
    for (let c = 1; c < nCols; c++) {
      cols[c - 1].push(parseFloat(fields[c]));
    }
  }
  if (time.length === 0) return null;

  const series: FdsCsvSeries[] = [];
  for (let c = 1; c < nCols; c++) {
    series.push({
      name: headers[c] || `col${c}`,
      unit: units[c] ?? "",
      values: cols[c - 1],
    });
  }
  return { time, series };
}

export const parseDevcCsv = parseFdsCsv;
export const parseHrrCsv = parseFdsCsv;

// Czas pierwszego przekroczenia setpointu (aktywacji) dla urządzeń DEVC z SETPOINT.
// Aktywacja = pierwsza zmiana znaku (wartość − setpoint) względem stanu początkowego
// (obejmuje zarówno wzrost powyżej, jak i spadek poniżej progu — bez zakładania kierunku).
export function computeActivations(
  data: FdsCsvData | null,
  setpoints: FdsDevc[] | null | undefined
): DevcActivation[] {
  if (!data || !setpoints?.length) return [];

  const byName = new Map(data.series.map((s) => [s.name.trim().toLowerCase(), s]));
  const out: DevcActivation[] = [];

  for (const d of setpoints) {
    if (d.setpoint === null) continue;
    const s = byName.get(d.id.trim().toLowerCase());
    if (!s) continue;

    const sp = d.setpoint;
    let tActivated: number | null = null;
    let initialSign = 0;
    for (let i = 0; i < s.values.length; i++) {
      const v = s.values[i];
      if (isNaN(v)) continue;
      const sign = v >= sp ? 1 : -1;
      if (initialSign === 0) {
        initialSign = sign;
        continue;
      }
      if (sign !== initialSign) {
        tActivated = data.time[i];
        break;
      }
    }
    out.push({ id: d.id, quantity: d.quantity, setpoint: sp, tActivated });
  }
  return out;
}
