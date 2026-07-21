"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  decodeSliceData, quantityLabel, turboCss, TURBO_LUT, type FdsSlice,
} from "@/lib/fds/slice";

interface SliceViewProps {
  slice: FdsSlice | null;
  running: boolean;
}

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// Wewnętrzna szerokość renderu canvas (CSS skaluje do szerokości kontenera).
const RENDER_W = 720;

function planeLabel(s: FdsSlice): string {
  if (s.plane === "z") return "poziomy (widok z góry)";
  if (s.plane === "y") return `pionowy (${s.ax.toUpperCase()}${s.ay.toUpperCase()})`;
  return `pionowy (${s.ax.toUpperCase()}${s.ay.toUpperCase()})`;
}

function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 100) return Math.round(n).toString();
  if (a >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

export default function SliceView({ slice, running }: SliceViewProps) {
  const dark = useIsDark();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const grid = useMemo(() => (slice ? decodeSliceData(slice) : null), [slice]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !slice || !grid) return;

    // Bufor w natywnej rozdzielczości siatki, potem skalowanie z interpolacją.
    const off = document.createElement("canvas");
    off.width = slice.w;
    off.height = slice.h;
    const octx = off.getContext("2d");
    if (!octx) return;
    const img = octx.createImageData(slice.w, slice.h);

    for (let row = 0; row < slice.h; row++) {
      // wiersz 0 danych = dół (y0); w obrazie wiersz 0 = góra → odwracamy
      const src = slice.h - 1 - row;
      for (let col = 0; col < slice.w; col++) {
        const v = grid[src * slice.w + col];
        const p = (row * slice.w + col) * 4;
        img.data[p] = TURBO_LUT[v * 3];
        img.data[p + 1] = TURBO_LUT[v * 3 + 1];
        img.data[p + 2] = TURBO_LUT[v * 3 + 2];
        img.data[p + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);

    const wSpan = Math.abs(slice.x1 - slice.x0) || slice.w;
    const hSpan = Math.abs(slice.y1 - slice.y0) || slice.h;
    const aspect = hSpan / wSpan;
    const renderH = Math.max(140, Math.min(560, Math.round(RENDER_W * aspect)));
    canvas.width = RENDER_W;
    canvas.height = renderH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, RENDER_W, renderH);
    ctx.drawImage(off, 0, 0, slice.w, slice.h, 0, 0, RENDER_W, renderH);
  }, [slice, grid]);

  if (!slice || !grid) {
    if (!running) return null;
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Podgląd przekroju</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
          Kolorowa mapa przekroju pojawia się, gdy model zawiera przynajmniej jeden
          przekrój <span className="font-mono">&amp;SLCF</span> (np. temperatura albo widzialność na zadanej
          wysokości) i FDS zapisze pierwsze kroki czasowe.
        </p>
      </div>
    );
  }

  const unit = slice.coords === "m" ? "m" : "kom.";
  const label = quantityLabel(slice.q, slice.short);
  const barStops = [0, 0.25, 0.5, 0.75, 1];
  const axU = slice.ax.toUpperCase();
  const ayU = slice.ay.toUpperCase();
  const planeU = slice.plane.toUpperCase();

  // Podpisy skali (od góry = vmax do dołu = vmin)
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => ({
    f,
    v: slice.vmin + (slice.vmax - slice.vmin) * f,
  }));

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Podgląd przekroju — {label}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            przekrój {planeLabel(slice)} · {planeU} = {fmt(slice.pos)} {unit}
            {slice.unit ? <span className="ml-2">jednostka: {slice.unit}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
            t = {fmt(slice.t)} s
          </span>
          {running && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">odświeżanie co ~10 s</span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-3 items-stretch">
          {/* Mapa przekroju */}
          <div className="min-w-0 flex-1">
            <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
              <canvas
                ref={canvasRef}
                className="block w-full h-auto"
                style={{ imageRendering: "auto" }}
              />
              {/* Etykiety osi */}
              <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-mono text-white/90">
                {ayU} ↑ {fmt(slice.y0)}–{fmt(slice.y1)} {unit}
              </span>
              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-mono text-white/90">
                {axU} → {fmt(slice.x0)}–{fmt(slice.x1)} {unit}
              </span>
            </div>
          </div>

          {/* Pasek skali (legenda barwna) */}
          <div className="flex flex-col items-stretch shrink-0" style={{ width: 64 }}>
            <div className="flex-1 flex gap-1.5">
              <div
                className="w-3.5 rounded-sm border border-slate-200 dark:border-slate-700"
                style={{
                  background: `linear-gradient(to top, ${barStops
                    .map((s) => `${turboCss(s)} ${s * 100}%`)
                    .join(", ")})`,
                }}
              />
              <div className="flex flex-col justify-between py-0.5">
                {ticks.map((t) => (
                  <span key={t.f} className="text-[10px] font-mono leading-none text-slate-500 dark:text-slate-400">
                    {fmt(t.v)}
                  </span>
                ))}
              </div>
            </div>
            {slice.unit && (
              <span className="mt-1.5 text-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
                [{slice.unit}]
              </span>
            )}
          </div>
        </div>

        <p className="mt-2.5 text-[10px] text-slate-400 dark:text-slate-500">
          Podgląd poglądowy (siatka {slice.w}×{slice.h}, interpolacja) — pełna rozdzielczość
          w plikach <span className="font-mono">.sf</span> do otwarcia w Smokeview po zakończeniu.
        </p>
      </div>
    </div>
  );
}
