"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  decodeSliceData, quantityLabel, turboCss, TURBO_LUT,
  normalizeSlices, type FdsSlice, type FdsSliceJson,
} from "@/lib/fds/slice";
import { parseSfFrames, type SfFrames } from "@/lib/fds/slice-parser";

interface SliceViewProps {
  slice: FdsSliceJson | null;
  running: boolean;
  caseId: string;
  done: boolean;
}

const RENDER_W = 900; // wewnętrzna rozdzielczość canvas (CSS skaluje do kontenera)

function planeLabel(s: FdsSlice): string {
  if (s.plane === "z") return "poziomy (widok z góry)";
  return `pionowy (${s.ax.toUpperCase()}${s.ay.toUpperCase()})`;
}
function planeShort(s: FdsSlice): string {
  return s.plane === "z" ? "poziom" : "pion";
}
function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 100) return Math.round(n).toString();
  if (a >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

const LEGEND_GRADIENT = `linear-gradient(to top, ${[0, 0.2, 0.4, 0.6, 0.8, 1]
  .map((s) => `${turboCss(s)} ${s * 100}%`)
  .join(", ")})`;

export default function SliceView({ slice, running, caseId, done }: SliceViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const slices = useMemo(() => normalizeSlices(slice), [slice]);
  const [selId, setSelId] = useState<string | null>(null);
  const [crisp, setCrisp] = useState(false);

  // Zakres wartości do zaznaczenia na CZARNO (znormalizowany 0..1). Pełny = brak.
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(1);
  const [dragging, setDragging] = useState<"lo" | "hi" | null>(null);
  const active = lo > 0.001 || hi < 0.999;

  // Animacja w czasie (wczytana z pliku .sf po zakończeniu)
  const [anim, setAnim] = useState<SfFrames | null>(null);
  const [animLoading, setAnimLoading] = useState(false);
  const [animError, setAnimError] = useState<string | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const sel = useMemo(() => {
    if (!slices.length) return null;
    return slices.find((s) => (s.id ?? "") === selId) ?? slices[0];
  }, [slices, selId]);

  const liveGrid = useMemo(() => (sel ? decodeSliceData(sel) : null), [sel]);

  // Zmiana przekroju kasuje animację (jest związana z konkretnym plikiem .sf)
  useEffect(() => {
    setAnim(null);
    setPlaying(false);
    setAnimError(null);
  }, [sel?.id]);

  // Odtwarzanie
  useEffect(() => {
    if (!playing || !anim) return;
    const id = setInterval(() => {
      setFrameIdx((i) => (i + 1) % anim.frames.length);
    }, 110);
    return () => clearInterval(id);
  }, [playing, anim]);

  // Bieżąca klatka do narysowania: z animacji albo z podglądu na żywo
  const view = useMemo(() => {
    if (anim && anim.frames.length) {
      const f = anim.frames[Math.min(frameIdx, anim.frames.length - 1)];
      return { grid: f.data, gw: anim.w, gh: anim.h, vmin: anim.vmin, vmax: anim.vmax, t: f.t };
    }
    if (sel && liveGrid) {
      return { grid: liveGrid, gw: sel.w, gh: sel.h, vmin: sel.vmin, vmax: sel.vmax, t: sel.t };
    }
    return null;
  }, [anim, frameIdx, sel, liveGrid]);

  // Rysowanie mapy — reaguje na klatkę, zaznaczony zakres (czerń), tryb ostrości
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !view || !sel) return;
    const { grid, gw, gh } = view;

    const off = document.createElement("canvas");
    off.width = gw;
    off.height = gh;
    const octx = off.getContext("2d");
    if (!octx) return;
    const img = octx.createImageData(gw, gh);

    const loB = active ? lo : -1;
    const hiB = active ? hi : -1;
    for (let row = 0; row < gh; row++) {
      const src = gh - 1 - row; // wiersz 0 danych = dół (y0) → w obrazie odwracamy
      for (let col = 0; col < gw; col++) {
        const v = grid[src * gw + col];
        const p = (row * gw + col) * 4;
        const t01 = v / 255;
        if (active && t01 >= loB && t01 <= hiB) {
          img.data[p] = 0; img.data[p + 1] = 0; img.data[p + 2] = 0; // zaznaczony zakres → czerń
        } else {
          img.data[p] = TURBO_LUT[v * 3];
          img.data[p + 1] = TURBO_LUT[v * 3 + 1];
          img.data[p + 2] = TURBO_LUT[v * 3 + 2];
        }
        img.data[p + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);

    const wSpan = Math.abs(sel.x1 - sel.x0) || gw;
    const hSpan = Math.abs(sel.y1 - sel.y0) || gh;
    const renderH = Math.max(160, Math.min(620, Math.round(RENDER_W * (hSpan / wSpan))));
    canvas.width = RENDER_W;
    canvas.height = renderH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = !crisp;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, RENDER_W, renderH);
    ctx.drawImage(off, 0, 0, gw, gh, 0, 0, RENDER_W, renderH);
  }, [view, sel, lo, hi, active, crisp]);

  // ── Suwak zakresu na legendzie ──────────────────────────────────────────────
  const fracFromEvent = (clientY: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return 0;
    return Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
  };
  const onTrackDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fracFromEvent(e.clientY);
    const which: "lo" | "hi" = Math.abs(f - lo) <= Math.abs(f - hi) ? "lo" : "hi";
    if (which === "lo") setLo(Math.min(f, hi));
    else setHi(Math.max(f, lo));
    setDragging(which);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTrackMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const f = fracFromEvent(e.clientY);
    if (dragging === "lo") setLo(Math.min(f, hi));
    else setHi(Math.max(f, lo));
  };
  const onTrackUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(null);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const loadAnim = async () => {
    if (!sel?.id) return;
    setAnimLoading(true);
    setAnimError(null);
    try {
      const res = await fetch(`/api/symulacje/${caseId}/download?file=${encodeURIComponent(sel.id)}`);
      if (!res.ok) throw new Error("download");
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 160 * 1024 * 1024) throw new Error("too-big");
      const parsed = parseSfFrames(buf);
      if (!parsed || !parsed.frames.length) throw new Error("parse");
      setAnim(parsed);
      setFrameIdx(parsed.frames.length - 1);
      setPlaying(false);
    } catch {
      setAnimError("Nie udało się wczytać animacji z pliku .sf.");
    } finally {
      setAnimLoading(false);
    }
  };

  if (!sel || !view) {
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

  const unit = sel.coords === "m" ? "m" : "kom.";
  const label = quantityLabel(sel.q, sel.short);
  const axU = sel.ax.toUpperCase();
  const ayU = sel.ay.toUpperCase();
  const planeU = sel.plane.toUpperCase();
  const span = view.vmax - view.vmin;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => view.vmin + span * f);
  const selVals = active ? { lo: view.vmin + lo * span, hi: view.vmin + hi * span } : null;
  const inAnim = !!anim;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Podgląd przekroju — {label}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            przekrój {planeLabel(sel)} · {planeU} = {fmt(sel.pos)} {unit}
            {sel.unit ? <span className="ml-2">jednostka: {sel.unit}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
            t = {fmt(view.t)} s{inAnim && <span className="ml-1 text-slate-400">/ {fmt(anim.frames[anim.frames.length - 1].t)}</span>}
          </span>
          {running && !inAnim && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">odświeżanie co ~10 s</span>
          )}
        </div>
      </div>

      {/* Pasek narzędzi */}
      <div className="flex items-center justify-between gap-3 px-5 pt-3 flex-wrap">
        {slices.length > 1 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mr-0.5">Przekrój:</span>
            {slices.map((s) => {
              const on = (s.id ?? "") === (sel.id ?? "");
              return (
                <button
                  key={s.id ?? `${s.q}-${s.plane}-${s.pos}`}
                  onClick={() => setSelId(s.id ?? null)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    on
                      ? "border-transparent bg-primary text-white"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {quantityLabel(s.q, s.short)} · {planeShort(s)} {fmt(s.pos)}{s.coords === "m" ? "m" : ""}
                </button>
              );
            })}
          </div>
        ) : <span />}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCrisp((c) => !c)}
            className="rounded border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {crisp ? "Wygładź" : "Ostre komórki"}
          </button>
          {done && !inAnim && !!sel.id && (
            <button
              onClick={loadAnim}
              disabled={animLoading}
              className="rounded border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
            >
              {animLoading ? "Wczytywanie…" : "▶ Animacja w czasie"}
            </button>
          )}
          {inAnim && (
            <button
              onClick={() => { setAnim(null); setPlaying(false); }}
              className="rounded border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Zamknij animację
            </button>
          )}
        </div>
      </div>

      {animError && (
        <p className="px-5 pt-2 text-[11px] text-amber-600 dark:text-amber-400">{animError}</p>
      )}

      <div className="p-5 pt-3">
        <div className="flex gap-3 items-stretch">
          {/* Mapa przekroju */}
          <div className="min-w-0 flex-1">
            <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
              <canvas ref={canvasRef} className="block w-full h-auto" style={{ imageRendering: crisp ? "pixelated" : "auto" }} />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-mono text-white/90">
                {ayU} ↑ {fmt(sel.y0)}–{fmt(sel.y1)} {unit}
              </span>
              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-mono text-white/90">
                {axU} → {fmt(sel.x0)}–{fmt(sel.x1)} {unit}
              </span>
              {selVals && (
                <span className="absolute left-1.5 bottom-1.5 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-mono text-slate-900">
                  na czarno: {fmt(selVals.lo)}–{fmt(selVals.hi)} {sel.unit}
                </span>
              )}
            </div>
          </div>

          {/* Legenda z suwakiem zakresu (przeciągnij, by zaznaczyć na czarno) */}
          <div className="flex flex-col items-stretch shrink-0" style={{ width: 82 }}>
            <div className="flex-1 flex gap-1.5">
              <div
                ref={trackRef}
                onPointerDown={onTrackDown}
                onPointerMove={onTrackMove}
                onPointerUp={onTrackUp}
                className="relative w-4 rounded-sm border border-slate-200 dark:border-slate-700 cursor-ns-resize"
                style={{ background: LEGEND_GRADIENT, touchAction: "none" }}
                title="Przeciągnij, aby zaznaczyć zakres wartości na czarno"
              >
                {active && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: `${(1 - hi) * 100}%`, height: `${(hi - lo) * 100}%`, background: "rgba(0,0,0,0.62)" }}
                  />
                )}
                {/* Uchwyty */}
                {([["hi", hi], ["lo", lo]] as const).map(([k, frac]) => (
                  <div
                    key={k}
                    className="absolute left-[-3px] right-[-3px] h-[4px] rounded-sm bg-white border border-slate-500 pointer-events-none shadow"
                    style={{ top: `calc(${(1 - frac) * 100}% - 2px)` }}
                  />
                ))}
              </div>
              <div className="flex flex-col justify-between py-0.5">
                {ticks.map((v, i) => (
                  <span key={i} className="text-[10px] font-mono leading-none text-slate-500 dark:text-slate-400">
                    {fmt(v)}
                  </span>
                ))}
              </div>
            </div>
            <span className="mt-1.5 text-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {sel.unit ? `[${sel.unit}]` : ""}
            </span>
            {active && (
              <button onClick={() => { setLo(0); setHi(1); }} className="mt-1 text-[10px] text-primary hover:underline">
                wyczyść zaznaczenie
              </button>
            )}
          </div>
        </div>

        {/* Oś czasu (animacja) */}
        {inAnim && (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shrink-0"
            >
              {playing ? "❚❚ Pauza" : "▶ Odtwórz"}
            </button>
            <input
              type="range"
              min={0}
              max={anim.frames.length - 1}
              value={Math.min(frameIdx, anim.frames.length - 1)}
              onChange={(e) => { setPlaying(false); setFrameIdx(Number(e.target.value)); }}
              className="flex-1 accent-primary"
            />
            <span className="shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400 w-24 text-right">
              {fmt(view.t)} s · {Math.min(frameIdx, anim.frames.length - 1) + 1}/{anim.frames.length}
            </span>
          </div>
        )}

        <p className="mt-2.5 text-[10px] text-slate-400 dark:text-slate-500">
          Podgląd poglądowy (siatka {view.gw}×{view.gh}{active ? ", zaznaczony zakres na czarno" : ""}
          {inAnim ? ` · animacja z ${anim.nframesTotal} kroków` : ""}) — przeciągnij suwak na legendzie,
          aby zaznaczyć zakres wartości. Pełna rozdzielczość w plikach <span className="font-mono">.sf</span> (Smokeview).
        </p>
      </div>
    </div>
  );
}
