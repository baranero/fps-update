// Kliencki parser binarnego pliku przekroju FDS (.sf) — do odtwarzania przekroju
// W CZASIE. Klient pobiera cały plik przez proxy pobierania (same-origin), a tu
// wyciągamy do `maxFrames` równomiernie rozłożonych klatek, downsamplujemy do
// `maxDim` i kwantyzujemy do uint8 ze WSPÓLNYM zakresem vmin/vmax (spójne kolory
// w całej animacji). Geometria (osie, metry) pochodzi z podglądu na żywo (`FdsSlice`),
// więc tu jej nie liczymy.
//
// Format .sf (rekordy Fortran, markery 4-bajtowe, little-endian):
//   [char30 QUANTITY][char30 SHORT][char30 UNITS][6×int32 I1,I2,J1,J2,K1,K2]
//   potem powtarzane:  [float32 TIME][npts×float32 dane]

import type { Axis } from "./slice";

export interface SfFrame {
  t: number;
  data: Uint8Array; // w*h, row-major, wiersz 0 = dół (y0) — jak w FdsSlice
}

export interface SfFrames {
  q: string;
  unit: string;
  short: string;
  plane: Axis;
  w: number;
  h: number;
  vmin: number;
  vmax: number;
  nframesTotal: number;
  frames: SfFrame[];
}

interface Rec { off: number; len: number; next: number; }

function readRecord(dv: DataView, off: number): Rec | null {
  if (off + 4 > dv.byteLength) return null;
  const n = dv.getInt32(off, true);
  if (n < 0 || off + 4 + n + 4 > dv.byteLength) return null;
  const tail = dv.getInt32(off + 4 + n, true);
  if (tail !== n) return null;
  return { off: off + 4, len: n, next: off + 4 + n + 4 };
}

function decodeStr(dv: DataView, r: Rec): string {
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset + r.off, r.len);
  return new TextDecoder("latin1").decode(bytes).replace(/\0/g, " ").trim();
}

// Domyślnie parsujemy blisko rozdzielczości natywnej (maxDim 400) — plik jest już
// u klienta, więc możemy zachować pełny detal siatki FDS. maxFrames ogranicza
// liczbę klatek osi czasu (pamięć), nie rozdzielczość przestrzenną.
export function parseSfFrames(buf: ArrayBuffer, maxFrames = 120, maxDim = 400): SfFrames | null {
  const dv = new DataView(buf);
  let off = 0;
  const r1 = readRecord(dv, off); if (!r1) return null; off = r1.next;
  const r2 = readRecord(dv, off); if (!r2) return null; off = r2.next;
  const r3 = readRecord(dv, off); if (!r3) return null; off = r3.next;
  const r4 = readRecord(dv, off); if (!r4 || r4.len < 24) return null; off = r4.next;

  const q = decodeStr(dv, r1);
  const short = decodeStr(dv, r2);
  const unit = decodeStr(dv, r3);
  const i1 = dv.getInt32(r4.off, true), i2 = dv.getInt32(r4.off + 4, true);
  const j1 = dv.getInt32(r4.off + 8, true), j2 = dv.getInt32(r4.off + 12, true);
  const k1 = dv.getInt32(r4.off + 16, true), k2 = dv.getInt32(r4.off + 20, true);
  const nx = i2 - i1 + 1, ny = j2 - j1 + 1, nz = k2 - k1 + 1;
  if (nx < 1 || ny < 1 || nz < 1) return null;
  const npts = nx * ny * nz;

  const start = off;
  const frameBytes = 12 + 8 + npts * 4;
  const nframes = Math.floor((dv.byteLength - start) / frameBytes);
  if (nframes < 1) return null;

  // Mapowanie płaszczyzny (zgodne z parserem na maszynie): idx = v*stepv + h
  let plane: Axis, NH: number, NV: number, stepv: number;
  if (nx === 1) { plane = "x"; NH = ny; NV = nz; stepv = ny; }
  else if (ny === 1) { plane = "y"; NH = nx; NV = nz; stepv = nx; }
  else { plane = "z"; NH = nx; NV = ny; stepv = nx; }

  let sh = 1; while (Math.ceil(NH / sh) > maxDim) sh++;
  let sv = 1; while (Math.ceil(NV / sv) > maxDim) sv++;
  const w = Math.ceil(NH / sh);
  const h = Math.ceil(NV / sv);

  const N = Math.min(maxFrames, nframes);
  const sampled: number[] = [];
  for (let i = 0; i < N; i++) {
    sampled.push(N === 1 ? nframes - 1 : Math.round((i / (N - 1)) * (nframes - 1)));
  }

  // Odczyt tylko zachowywanych komórek (getFloat32 nie wymaga wyrównania)
  const grids: { t: number; g: Float32Array }[] = [];
  let vmin = Infinity, vmax = -Infinity;
  for (const fi of sampled) {
    const foff = start + fi * frameBytes;
    const tr = readRecord(dv, foff); if (!tr) continue;
    const drec = readRecord(dv, tr.next); if (!drec || drec.len < npts * 4) continue;
    const t = dv.getFloat32(tr.off, true);
    const g = new Float32Array(w * h);
    let p = 0;
    for (let v = 0; v < NV; v += sv) {
      for (let hh = 0; hh < NH; hh += sh) {
        const x = dv.getFloat32(drec.off + (v * stepv + hh) * 4, true);
        g[p++] = x;
        if (Number.isFinite(x)) {
          if (x < vmin) vmin = x;
          if (x > vmax) vmax = x;
        }
      }
    }
    grids.push({ t, g });
  }
  if (!grids.length || vmin === Infinity) return null;
  if (vmax <= vmin) vmax = vmin + 1;
  const span = vmax - vmin;

  const frames: SfFrame[] = grids.map(({ t, g }) => {
    const data = new Uint8Array(g.length);
    for (let i = 0; i < g.length; i++) {
      const x = g[i];
      if (!Number.isFinite(x)) { data[i] = 0; continue; }
      let qv = Math.round(((x - vmin) / span) * 255);
      if (qv < 0) qv = 0; else if (qv > 255) qv = 255;
      data[i] = qv;
    }
    return { t, data };
  });

  return { q, unit, short, plane, w, h, vmin, vmax, nframesTotal: nframes, frames };
}
