"use client";

// Ujęcia Smokeview z maszyny liczącej: podgląd na żywo (co ~5 min w trakcie
// biegu) i seria rycin do raportu (co stały krok czasu po zakończeniu).
// Obraz renderuje prawdziwy Smokeview z pakietu FDS — to, co klient zobaczy,
// otwierając wyniki u siebie, a nie nasza interpretacja danych.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Btn } from "@/components/Cloud/ui";
import { viewCaption, type PreviewFrame, type PreviewManifest } from "@/lib/fds/preview";
import { saveFilePicker, streamZipToFile, type WritableFileHandle } from "@/lib/fds/zip-client";

type Mode = "live" | "report";

/** Odświeżanie manifestu w trakcie biegu — maszyna renderuje co 5 min. */
const POLL_MS = 60_000;

export default function SmokeviewView({
  caseId, running, finished,
}: { caseId: string; running: boolean; finished: boolean }) {
  const t = useTranslations("symDetail.smv");
  const locale = useLocale();
  const numLocale = locale === "en" ? "en-GB" : "pl-PL";

  const [manifest, setManifest] = useState<PreviewManifest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("live");
  const [viewId, setViewId] = useState<string | null>(null);
  // null = „najnowsza” (podąża za kolejnymi ujęciami w trakcie biegu).
  const [frameIdx, setFrameIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [zipMsg, setZipMsg] = useState<string | null>(null);
  const modeTouched = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/symulacje/${caseId}/podglad`);
      if (!res.ok) return;
      const d = await res.json();
      setManifest(d.manifest ?? null);
    } catch {
      /* brak podglądu nie psuje strony zlecenia */
    } finally {
      setLoaded(true);
    }
  }, [caseId]);

  useEffect(() => {
    load();
    if (!running) return;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load, running]);

  // Po zakończeniu: jeśli są ryciny do raportu, to one są ciekawsze niż ostatni podgląd.
  useEffect(() => {
    if (!modeTouched.current && manifest?.report && finished) setMode("report");
  }, [manifest?.report, finished]);

  const frames: PreviewFrame[] = useMemo(
    () => (mode === "report" ? manifest?.report?.frames ?? [] : manifest?.live ?? []),
    [manifest, mode]
  );
  const views = useMemo(
    () => (manifest?.views ?? []).filter((v) => frames.some((f) => f.files[v.id])),
    [manifest, frames]
  );
  const view = views.find((v) => v.id === viewId) ?? views[0] ?? null;
  const viewFrames = useMemo(() => (view ? frames.filter((f) => f.files[view.id]) : []), [frames, view]);
  const idx = frameIdx == null ? viewFrames.length - 1 : Math.min(frameIdx, viewFrames.length - 1);
  const frame = viewFrames[idx] ?? null;

  // Odtwarzanie serii jak animacja poklatkowa.
  useEffect(() => {
    if (!playing || viewFrames.length < 2) return;
    const id = setInterval(() => {
      setFrameIdx((i) => {
        const cur = i == null ? viewFrames.length - 1 : i;
        return cur + 1 >= viewFrames.length ? 0 : cur + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [playing, viewFrames.length]);

  const pickMode = (m: Mode) => {
    modeTouched.current = true;
    setMode(m);
    setFrameIdx(null);
    setPlaying(false);
  };

  const fmtT = (s: number) => `${s.toLocaleString(numLocale, { maximumFractionDigits: 1 })} s`;

  // Ryciny do raportu jako ZIP — składany w przeglądarce, wprost z magazynu.
  const downloadReport = async () => {
    const rep = manifest?.report;
    if (!rep) return;
    const files = rep.frames.flatMap((f) =>
      Object.entries(f.files).map(([vid, url]) => ({
        name: `ryciny/${vid}_t${String(Math.round(f.t)).padStart(5, "0")}s.png`,
        url,
        size: null,
      }))
    );
    const picker = saveFilePicker();
    if (picker) {
      let handle: WritableFileHandle;
      try {
        handle = await picker({
          suggestedName: `${caseId}_ryciny.zip`,
          types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }],
        });
      } catch {
        return;
      }
      try {
        await streamZipToFile({
          caseId, files, handle,
          onProgress: (i, n) => setZipMsg(t("zipping", { i, n })),
        });
        setZipMsg(t("zipped", { n: files.length }));
      } catch {
        setZipMsg(t("zipFailed"));
      }
      return;
    }
    // Bez zapisu strumieniowego — pliki po kolei (obrazy są małe).
    for (let i = 0; i < files.length; i++) {
      setZipMsg(t("zipping", { i: i + 1, n: files.length }));
      const a = document.createElement("a");
      a.href = files[i].url;
      a.download = files[i].name.split("/").pop()!;
      a.click();
      await new Promise((r) => setTimeout(r, 400));
    }
    setZipMsg(t("zipped", { n: files.length }));
  };

  const chip = (on: boolean) =>
    `rounded-chip border px-3 py-1.5 font-mono text-fr-label uppercase transition-colors ${
      on ? "border-primary/40 bg-primary/10 text-accent" : "border-hairline text-muted hover:text-ink"
    }`;

  if (!loaded) {
    return <div className="h-64 animate-pulse rounded-card border border-hairline bg-panel" />;
  }

  if (!manifest || !view || !frame) {
    return (
      <div className="rounded-card border border-hairline bg-panel p-6">
        <p className="font-heading text-fr-h4 text-ink">{t("title")}</p>
        <p className="mt-2 text-fr-sm leading-relaxed text-muted">
          {running ? t("emptyRunning") : t("emptyDone")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-hairline bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline-soft px-5 py-4">
        <div>
          <p className="font-heading text-fr-h4 text-ink">{t("title")}</p>
          <p className="mt-0.5 text-fr-sm text-muted">{t("lead")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className={chip(mode === "live")} onClick={() => pickMode("live")} disabled={!manifest.live.length}>
            {t("modeLive")}
          </button>
          <button className={chip(mode === "report")} onClick={() => pickMode("report")} disabled={!manifest.report}>
            {t("modeReport")}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {views.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {views.map((v) => (
              <button key={v.id} className={chip(v.id === view.id)} onClick={() => { setViewId(v.id); setFrameIdx(null); }}>
                {viewCaption(v, t("smoke3d"), numLocale)}
              </button>
            ))}
          </div>
        )}

        <figure className="overflow-hidden rounded-panel border border-hairline-soft bg-well">
          {/* eslint-disable-next-line @next/next/no-img-element -- podpisany URL z magazynu, bez optymalizacji Next */}
          <img
            key={frame.files[view.id]}
            src={frame.files[view.id]}
            alt={`${viewCaption(view, t("smoke3d"), numLocale)} — t = ${fmtT(frame.t)}`}
            className="mx-auto block h-auto max-h-[70vh] w-full object-contain"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline-soft px-4 py-2 font-mono text-fr-sm text-muted">
            <span>{viewCaption(view, t("smoke3d"), numLocale)} — t = {fmtT(frame.t)}</span>
            {frame.at && (
              <span className="text-faint">
                {t("renderedAt", { time: new Date(frame.at).toLocaleTimeString(numLocale, { hour: "2-digit", minute: "2-digit" }) })}
              </span>
            )}
          </figcaption>
        </figure>

        {viewFrames.length > 1 && (
          <div className="flex items-center gap-3">
            <Btn size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>
              {playing ? t("pause") : t("play")}
            </Btn>
            <input
              type="range"
              min={0}
              max={viewFrames.length - 1}
              value={idx}
              onChange={(e) => { setPlaying(false); setFrameIdx(Number(e.target.value)); }}
              aria-label={t("timeline")}
              className="flex-1 accent-primary"
            />
            <span className="fr-num w-28 text-right font-mono text-fr-sm text-muted">
              {idx + 1} / {viewFrames.length}
            </span>
            {mode === "live" && frameIdx != null && (
              <Btn size="sm" variant="ghost" onClick={() => setFrameIdx(null)}>{t("latest")}</Btn>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <a href={frame.files[view.id]} download className="font-mono text-fr-label uppercase text-muted transition-colors hover:text-accent">
            {t("downloadFrame")}
          </a>
          {manifest.report && (
            <Btn size="sm" onClick={downloadReport}>
              {t("downloadReport", { n: manifest.report.frames.reduce((s, f) => s + Object.keys(f.files).length, 0) })}
            </Btn>
          )}
          {zipMsg && <span className="text-fr-sm text-muted">{zipMsg}</span>}
        </div>

        <p className="text-fr-sm leading-relaxed text-faint">
          {mode === "report" && manifest.report?.step
            ? t("noteReport", { step: manifest.report.step })
            : t("noteLive")}
        </p>
      </div>
    </div>
  );
}
