"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  decodeSliceData, turboCss, TURBO_LUT,
  normalizeSlices, type FdsSlice, type FdsSliceJson,
} from "@/lib/fds/slice";
import { parseSfFrames, type SfFrames } from "@/lib/fds/slice-parser";

interface SliceViewProps {
  slice: FdsSliceJson | null;
  running: boolean;
  caseId: string;
  done: boolean;
}

interface Frame { t: number; data: Uint8Array; w: number; h: number; vmin: number; vmax: number; }

const RENDER_W = 900;
const MAX_HIST = 400;

// Klucz tłumaczenia dla QUANTITY z FDS (spacje/warianty → jeden klucz)
const Q_KEY: Record<string, string> = {
  TEMPERATURE: "TEMPERATURE", VISIBILITY: "VISIBILITY", "SOOT VISIBILITY": "SOOTVIS",
  "SOOT DENSITY": "SOOTDENS", "SOOT MASS FRACTION": "SOOTDENS", HRRPUV: "HRRPUV",
  VELOCITY: "VELOCITY", "U-VELOCITY": "VELOCITY", "W-VELOCITY": "VELOCITY",
  PRESSURE: "PRESSURE", "LAYER HEIGHT": "LAYER",
};

function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 100) return Math.round(n).toString();
  if (a >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

const LEGEND_GRADIENT = `linear-gradient(to top, ${[0, 0.2, 0.4, 0.6, 0.8, 1]
  .map((s) => `${turboCss(s)} ${s * 100}%`)
  .join(", ")})`;

async function fetchTotalSize(url: string): Promise<number | null> {
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-0" } });
    const cr = r.headers.get("content-range");
    if (cr && cr.includes("/")) {
      const n = parseInt(cr.split("/")[1], 10);
      if (Number.isFinite(n)) return n;
    }
    return null;
  } catch {
    return null;
  }
}

const AUTO_ANIM_MAX_BYTES = 70 * 1024 * 1024;

export default function SliceView({ slice, running, caseId, done }: SliceViewProps) {
  const t = useTranslations("symDetail");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoTried = useRef<Set<string>>(new Set());

  const slices = useMemo(() => normalizeSlices(slice), [slice]);
  const [selId, setSelId] = useState<string | null>(null);
  const [crisp, setCrisp] = useState(false);

  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(1);
  const [dragging, setDragging] = useState<"lo" | "hi" | null>(null);
  const active = lo > 0.001 || hi < 0.999;

  const [hist, setHist] = useState<Record<string, Frame[]>>({});
  const [anim, setAnim] = useState<SfFrames | null>(null);
  const [animLoading, setAnimLoading] = useState(false);
  const [animError, setAnimError] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [follow, setFollow] = useState(true);
  const [playing, setPlaying] = useState(false);

  const sel = useMemo(() => {
    if (!slices.length) return null;
    return slices.find((s) => (s.id ?? "") === selId) ?? slices[0];
  }, [slices, selId]);
  const selKey = sel?.id ?? "_";

  const qLabel = (q: string, short: string): string => {
    const key = Q_KEY[q.toUpperCase()];
    return key ? t(`slice.quantity.${key}`) : (short || q);
  };
  const planeLabel = (s: FdsSlice) =>
    s.plane === "z" ? t("slice.planeH") : t("slice.planeV", { ax: s.ax.toUpperCase(), ay: s.ay.toUpperCase() });
  const planeShort = (s: FdsSlice) => (s.plane === "z" ? t("slice.planeShortH") : t("slice.planeShortV"));

  const liveGrid = useMemo(() => (sel ? decodeSliceData(sel) : null), [sel]);

  useEffect(() => {
    if (!sel || !liveGrid) return;
    setHist((prev) => {
      const arr = prev[selKey] ?? [];
      const last = arr[arr.length - 1];
      if (last && last.t === sel.t && last.data.length === liveGrid.length) return prev;
      const next = [...arr, { t: sel.t, data: liveGrid, w: sel.w, h: sel.h, vmin: sel.vmin, vmax: sel.vmax }];
      if (next.length > MAX_HIST) next.shift();
      return { ...prev, [selKey]: next };
    });
  }, [sel, liveGrid, selKey]);

  useEffect(() => {
    setAnim(null);
    setAnimError(null);
    setFollow(true);
    setPlaying(false);
  }, [selKey]);

  const timeline = useMemo(() => {
    if (anim && anim.frames.length) {
      return {
        mode: "anim" as const,
        length: anim.frames.length,
        total: anim.nframesTotal,
        at: (i: number): Frame => {
          const f = anim.frames[i];
          return { t: f.t, data: f.data, w: anim.w, h: anim.h, vmin: anim.vmin, vmax: anim.vmax };
        },
      };
    }
    const arr = hist[selKey] ?? [];
    return { mode: "live" as const, length: arr.length, total: arr.length, at: (i: number): Frame => arr[i] };
  }, [anim, hist, selKey]);

  useEffect(() => {
    if (follow && timeline.length > 0) setIdx(timeline.length - 1);
  }, [follow, timeline.length]);

  useEffect(() => {
    if (!playing || timeline.length < 2) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1 >= timeline.length ? 0 : i + 1));
    }, 110);
    return () => clearInterval(id);
  }, [playing, timeline.length]);

  const cur = useMemo<Frame | null>(() => {
    if (timeline.length > 0) return timeline.at(Math.min(idx, timeline.length - 1));
    if (sel && liveGrid) return { t: sel.t, data: liveGrid, w: sel.w, h: sel.h, vmin: sel.vmin, vmax: sel.vmax };
    return null;
  }, [timeline, idx, sel, liveGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cur || !sel) return;
    const { data, w, h } = cur;

    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    if (!octx) return;
    const img = octx.createImageData(w, h);

    for (let row = 0; row < h; row++) {
      const src = h - 1 - row;
      for (let col = 0; col < w; col++) {
        const v = data[src * w + col];
        const p = (row * w + col) * 4;
        const t01 = v / 255;
        if (active && t01 >= lo && t01 <= hi) {
          img.data[p] = 0; img.data[p + 1] = 0; img.data[p + 2] = 0;
        } else {
          img.data[p] = TURBO_LUT[v * 3];
          img.data[p + 1] = TURBO_LUT[v * 3 + 1];
          img.data[p + 2] = TURBO_LUT[v * 3 + 2];
        }
        img.data[p + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);

    const wSpan = Math.abs(sel.x1 - sel.x0) || w;
    const hSpan = Math.abs(sel.y1 - sel.y0) || h;
    const renderH = Math.max(160, Math.min(620, Math.round(RENDER_W * (hSpan / wSpan))));
    canvas.width = RENDER_W;
    canvas.height = renderH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = !crisp;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, RENDER_W, renderH);
    ctx.drawImage(off, 0, 0, w, h, 0, 0, RENDER_W, renderH);
  }, [cur, sel, lo, hi, active, crisp]);

  const fracFromEvent = (clientY: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return 0;
    return Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
  };
  const onTrackDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fracFromEvent(e.clientY);
    const which: "lo" | "hi" = Math.abs(f - lo) <= Math.abs(f - hi) ? "lo" : "hi";
    if (which === "lo") setLo(Math.min(f, hi)); else setHi(Math.max(f, lo));
    setDragging(which);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTrackMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const f = fracFromEvent(e.clientY);
    if (dragging === "lo") setLo(Math.min(f, hi)); else setHi(Math.max(f, lo));
  };
  const onTrackUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(null);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const loadAnim = async (id: string) => {
    setAnimLoading(true);
    setAnimError(null);
    try {
      const res = await fetch(`/api/symulacje/${caseId}/download?file=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("download");
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 220 * 1024 * 1024) throw new Error("too-big");
      const parsed = parseSfFrames(buf);
      if (!parsed || !parsed.frames.length) throw new Error("parse");
      setAnim(parsed);
      setFollow(false);
      setIdx(parsed.frames.length - 1);
      setPlaying(false);
    } catch {
      setAnimError(t("slice.animError"));
    } finally {
      setAnimLoading(false);
    }
  };

  useEffect(() => {
    if (!done || !sel?.id || anim || animLoading) return;
    const id = sel.id;
    if (autoTried.current.has(id)) return;
    autoTried.current.add(id);
    (async () => {
      const total = await fetchTotalSize(`/api/symulacje/${caseId}/download?file=${encodeURIComponent(id)}`);
      if (total === null || total <= AUTO_ANIM_MAX_BYTES) loadAnim(id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, sel?.id, anim, animLoading]);

  if (!sel || !cur) {
    if (!running) return null;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{t("slice.title")}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">{t("slice.empty")}</p>
      </div>
    );
  }

  const unit = sel.coords === "m" ? "m" : "cell";
  const label = qLabel(sel.q, sel.short);
  const axU = sel.ax.toUpperCase();
  const ayU = sel.ay.toUpperCase();
  const planeU = sel.plane.toUpperCase();
  const span = cur.vmax - cur.vmin;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => cur.vmin + span * f);
  const selVals = active ? { lo: cur.vmin + lo * span, hi: cur.vmin + hi * span } : null;
  const inAnim = timeline.mode === "anim";
  const curIdx = Math.min(idx, Math.max(0, timeline.length - 1));
  const atLatest = curIdx >= timeline.length - 1;
  const showTimeline = timeline.length > 1;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("slice.titleWith", { label })}</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("slice.planeInfo", { plane: planeLabel(sel), axis: planeU, pos: fmt(sel.pos), unit })}
            {sel.unit ? <span className="ml-2">{t("slice.unit", { unit: sel.unit })}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
            t = {fmt(cur.t)} s
          </span>
          {running && !inAnim && atLatest && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">{t("slice.refresh")}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pt-3 flex-wrap">
        {slices.length > 1 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mr-0.5">{t("slice.slicePick")}</span>
            {slices.map((s) => {
              const on = (s.id ?? "") === (sel.id ?? "");
              return (
                <button
                  key={s.id ?? `${s.q}-${s.plane}-${s.pos}`}
                  onClick={() => setSelId(s.id ?? null)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    on ? "border-transparent bg-primary text-white" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {qLabel(s.q, s.short)} · {planeShort(s)} {fmt(s.pos)}{s.coords === "m" ? "m" : ""}
                </button>
              );
            })}
          </div>
        ) : <span />}

        <div className="flex items-center gap-2">
          <button onClick={() => setCrisp((c) => !c)} className="rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            {crisp ? t("slice.smooth") : t("slice.crisp")}
          </button>
          {done && !inAnim && !!sel.id && (
            <button onClick={() => loadAnim(sel.id as string)} disabled={animLoading} className="rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60">
              {animLoading ? t("slice.loading") : t("slice.fullAnim")}
            </button>
          )}
          {inAnim && (
            <button onClick={() => { setAnim(null); setFollow(true); setPlaying(false); }} className="rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              {t("slice.closeAnim")}
            </button>
          )}
        </div>
      </div>

      {animError && <p className="px-5 pt-2 text-[11px] text-amber-600 dark:text-amber-400">{animError}</p>}

      <div className="p-5 pt-3">
        <div className="flex gap-3 items-stretch">
          <div className="min-w-0 flex-1">
            <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
              <canvas ref={canvasRef} className="block w-full h-auto" style={{ imageRendering: crisp ? "pixelated" : "auto" }} />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-mono text-white/90">{ayU} ↑ {fmt(sel.y0)}–{fmt(sel.y1)} {unit}</span>
              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-mono text-white/90">{axU} → {fmt(sel.x0)}–{fmt(sel.x1)} {unit}</span>
              {selVals && (
                <span className="absolute left-1.5 bottom-1.5 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-mono text-slate-900">{t("slice.blackMark", { lo: fmt(selVals.lo), hi: fmt(selVals.hi), unit: sel.unit })}</span>
              )}
              {!atLatest && running && !inAnim && (
                <span className="absolute right-1.5 top-1.5 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">{t("slice.steppedBack")}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch shrink-0" style={{ width: 82 }}>
            <div className="flex-1 flex gap-1.5">
              <div ref={trackRef} onPointerDown={onTrackDown} onPointerMove={onTrackMove} onPointerUp={onTrackUp} className="relative w-4 rounded-sm border border-slate-200 dark:border-slate-700 cursor-ns-resize" style={{ background: LEGEND_GRADIENT, touchAction: "none" }} title={t("slice.dragHint")}>
                {active && <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${(1 - hi) * 100}%`, height: `${(hi - lo) * 100}%`, background: "rgba(0,0,0,0.62)" }} />}
                {([["hi", hi], ["lo", lo]] as const).map(([k, frac]) => (
                  <div key={k} className="absolute left-[-3px] right-[-3px] h-[4px] rounded-sm bg-white border border-slate-500 pointer-events-none shadow" style={{ top: `calc(${(1 - frac) * 100}% - 2px)` }} />
                ))}
              </div>
              <div className="flex flex-col justify-between py-0.5">
                {ticks.map((v, i) => (
                  <span key={i} className="text-[10px] font-mono leading-none text-slate-500 dark:text-slate-400">{fmt(v)}</span>
                ))}
              </div>
            </div>
            <span className="mt-1.5 text-center text-[10px] font-mono text-slate-500 dark:text-slate-400">{sel.unit ? `[${sel.unit}]` : ""}</span>
            {active && <button onClick={() => { setLo(0); setHi(1); }} className="mt-1 text-[10px] text-primary hover:underline">{t("slice.clearSel")}</button>}
          </div>
        </div>

        {showTimeline && (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <button onClick={() => { setFollow(false); setPlaying((p) => !p); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shrink-0">
                {playing ? t("slice.pause") : t("slice.play")}
              </button>
              <input type="range" min={0} max={timeline.length - 1} value={curIdx} onChange={(e) => { setPlaying(false); setFollow(false); setIdx(Number(e.target.value)); }} className="flex-1 accent-primary" />
              <span className="shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400 w-28 text-right">
                {fmt(cur.t)} s · {curIdx + 1}/{timeline.length}
                {inAnim && timeline.total > timeline.length ? ` (/${timeline.total})` : ""}
              </span>
            </div>
            {running && !inAnim && !atLatest && (
              <button onClick={() => { setPlaying(false); setFollow(true); }} className="mt-1.5 text-[11px] font-semibold text-primary hover:underline">{t("slice.backToLive")}</button>
            )}
          </div>
        )}

        <p className="mt-2.5 text-[10px] text-slate-400 dark:text-slate-500">
          {inAnim
            ? t("slice.footAnim", { total: timeline.total, shown: timeline.length })
            : running ? t("slice.footLive") : t("slice.footDone")}
          {" "}{t("slice.footTail")}
        </p>
      </div>
    </div>
  );
}
