"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";

interface JobData {
  caseId: string;
  status: "pending" | "dispatched" | "running" | "done" | "failed";
  fileName: string;
  totalCells: number;
  tEnd: number;
  complexity: string;
  vcpuHours: number;
  wallHours: number;
  price: number;
  serverType: string | null;
  dispatchedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  fdsLog: string | null;
  results: Array<{ name: string; url: string; size: number | null; createdAt: string | null }> | null;
}

const STATUS_CONFIG = {
  pending: {
    label: "Przyjęte",
    desc: "Zlecenie zapisane, uruchamiam serwer obliczeniowy…",
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
    dot: "bg-slate-400 animate-pulse",
  },
  dispatched: {
    label: "Serwer uruchamiany",
    desc: "Maszyna obliczeniowa startuje, instalacja FDS…",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    dot: "bg-blue-500 animate-pulse",
  },
  running: {
    label: "Obliczenia w toku",
    desc: "FDS działa na serwerze chmurowym.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    dot: "bg-amber-500 animate-pulse",
  },
  done: {
    label: "Gotowe",
    desc: "Obliczenia zakończone. Wyniki dostępne poniżej.",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    dot: "bg-green-500",
  },
  failed: {
    label: "Błąd",
    desc: "Obliczenia zakończyły się błędem. Skontaktuj się z nami.",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    dot: "bg-red-500",
  },
};

function formatCells(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} tys.`;
  return String(n);
}

function elapsed(from: string | null): string {
  if (!from) return "—";
  const s = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}

function fileIcon(name: string) {
  if (name.endsWith(".smv")) return "📊";
  if (name.endsWith(".csv")) return "📄";
  if (name.endsWith(".log")) return "📋";
  return "📁";
}

function fileType(name: string): string {
  if (name.endsWith(".smv"))  return "Scena Smokeview";
  if (name.endsWith(".csv"))  return "Dane urządzeń";
  if (name.endsWith(".log"))  return "Log obliczeń";
  if (name.endsWith(".s3d"))  return "Dym 3D";
  if (name.endsWith(".q"))    return "Dane 3D";
  if (name.endsWith(".sf"))   return "Przekrój";
  if (name.endsWith(".bf"))   return "Granica";
  if (name.endsWith(".prt5")) return "Cząsteczki";
  if (name.endsWith(".fds"))  return "Plik FDS";
  return name.split(".").pop()?.toUpperCase() ?? "Plik";
}

function parseFdsProgress(log: string, tEnd: number): { pct: number; currentTime: number } | null {
  const matches = Array.from(log.matchAll(/Total Time:\s+([\d.E+\-]+)\s*s/g));
  if (!matches.length || !tEnd) return null;
  const currentTime = parseFloat(matches[matches.length - 1][1]);
  if (isNaN(currentTime)) return null;
  return { pct: Math.min(100, (currentTime / tEnd) * 100), currentTime };
}

interface FdsStats {
  version: string | null;
  chid: string | null;
  currentStep: number | null;
  currentTime: number | null;
  stepSize: number | null;
  iteRate: string | null;
  meshCount: number | null;
  totalCells: number | null;
  startTime: string | null;
}

function parseFdsStats(log: string): FdsStats {
  const version   = log.match(/Revision\s*:\s*(\S+)/)?.[1] ?? null;
  const chid      = log.match(/Job ID string\s*:\s*(.+)/)?.[1]?.trim() ?? null;
  const startTime = log.match(/Current Date\s*:\s*(.+)/)?.[1]?.trim() ?? null;

  const stepMatches = Array.from(
    log.matchAll(/Step Size:\s*([\d.E+\-]+)\s*s,\s*Total Time:\s*([\d.E+\-]+)\s*s,\s*Ite Rate\/Proc:\s*([\d.E+\-nan]+)/g)
  );
  const last = stepMatches[stepMatches.length - 1];
  const stepSize   = last ? parseFloat(last[1]) : null;
  const currentTime = last ? parseFloat(last[2]) : null;
  const iteRate    = last ? last[3] : null;

  const stepNums = Array.from(log.matchAll(/Time Step\s+(\d+)/g));
  const currentStep = stepNums.length ? parseInt(stepNums[stepNums.length - 1][1]) : null;

  const meshLines = Array.from(log.matchAll(/Number of Grid Cells\s+([\d,]+)/g));
  const totalCells = meshLines.length
    ? meshLines.reduce((s, m) => s + parseInt(m[1].replace(/,/g, "")), 0)
    : null;
  const meshCount = meshLines.length || null;

  return { version, chid, currentStep, currentTime, stepSize, iteRate, meshCount, totalCells, startTime };
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function JobStatusPage({
  params,
}: {
  params: { caseId: string };
}) {
  const { caseId } = params;
  const [job, setJob] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [logMode, setLogMode] = useState<"basic" | "advanced">("basic");
  const termRef = useRef<HTMLDivElement>(null);
  const termScrolledUpRef = useRef(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/symulacje/${caseId}`);
      if (!res.ok) { setError("Nie znaleziono zlecenia."); return; }
      const data: JobData = await res.json();
      setJob(data);
      if (data.status === "done" || data.status === "failed") {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {
      setError("Błąd połączenia z serwerem.");
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
      fetchStatus();
    }, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Odświeżaj licznik czasu co sekundę
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll terminala do dołu przy nowym logu — tylko jeśli użytkownik nie scrollował w górę
  useEffect(() => {
    if (logMode === "advanced" && termRef.current && !termScrolledUpRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.fdsLog, logMode]);

  const allFiles = job?.results ?? [];
  const allSelected = allFiles.length > 0 && allFiles.every((f) => selected.has(f.name));
  const someSelected = allFiles.some((f) => selected.has(f.name));

  const toggleFile = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(allFiles.map((f) => f.name)));

  const downloadFile = (f: { name: string; url: string }) => {
    const a = document.createElement("a");
    a.href = f.url;
    a.download = f.name;
    a.click();
  };

  const downloadZip = async (files: Array<{ name: string; url: string }>) => {
    if (files.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        files.map(async (f) => {
          const res = await fetch(f.url);
          const blob = await res.blob();
          zip.file(f.name, blob);
        })
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${caseId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  };

  if (error) return (
    <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-8 text-center">
      <p className="font-bold text-red-700 dark:text-red-400">{error}</p>
      <Link href="/narzedzia/symulacje" className="mt-4 inline-block text-sm text-primary hover:underline">← Wróć</Link>
    </div>
  );

  if (!job) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ))}
    </div>
  );

  const cfg = STATUS_CONFIG[job.status];
  const activeFrom = job.startedAt ?? job.dispatchedAt;
  const isActive = job.status === "running" || job.status === "dispatched";

  return (
    <div className="space-y-6" suppressHydrationWarning>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/narzedzia/symulacje" className="text-xs text-slate-400 hover:text-primary transition-colors">
            ← Symulacje FDS
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{job.fileName}</h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{job.caseId}</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${cfg.bg} ${cfg.color} shrink-0`}>
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border p-5 ${cfg.bg}`}>
        <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.desc}</p>
        {isActive && activeFrom && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Czas od startu: <span className="font-mono font-bold">{elapsed(activeFrom)}</span>
            {job.wallHours > 0 && (
              <span className="ml-2 text-slate-400">
                / szacowany: {job.wallHours < 1 ? `${Math.round(job.wallHours * 60)} min` : `${job.wallHours.toFixed(1)} h`}
              </span>
            )}
          </p>
        )}
        {job.status === "done" && job.completedAt && job.dispatchedAt && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Czas całkowity:{" "}
            <span className="font-mono font-bold">
              {elapsed(job.dispatchedAt)}
            </span>
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-5">
        <h2 className="text-xs font-medium text-slate-500 mb-3">Postęp</h2>
        <div className="space-y-3">
          {(
            [
              { key: "pending", label: "Zlecenie przyjęte", time: null },
              { key: "dispatched", label: "Serwer uruchomiony", time: job.dispatchedAt },
              { key: "running", label: "Obliczenia FDS", time: job.startedAt },
              { key: "done", label: "Wyniki gotowe", time: job.completedAt },
            ] as const
          ).map((step) => {
            const statuses = ["pending", "dispatched", "running", "done", "failed"];
            const stepIdx = statuses.indexOf(step.key);
            const currentIdx = statuses.indexOf(job.status);
            const done = stepIdx < currentIdx || (step.key === "done" && job.status === "done");
            const active = step.key === job.status;
            const failed = job.status === "failed" && stepIdx === currentIdx;

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  failed ? "bg-red-100 dark:bg-red-900/30" :
                  done ? "bg-green-100 dark:bg-green-900/30" :
                  active ? "bg-primary/10" :
                  "bg-slate-100 dark:bg-slate-800"
                }`}>
                  {done ? (
                    <svg className="h-3 w-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  )}
                </div>
                <span className={`text-sm ${done || active ? "font-semibold text-slate-900 dark:text-white" : "text-slate-400"}`}>
                  {step.label}
                </span>
                {step.time && (
                  <span className="ml-auto text-[11px] font-mono text-slate-400">
                    {new Date(step.time).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Model details */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Komórki", value: formatCells(job.totalCells) },
          { label: "Czas symulacji", value: `${job.tEnd} s` },
          { label: "vCPU-hours", value: job.vcpuHours.toFixed(1) },
          { label: "Cena netto", value: `${job.price.toLocaleString("pl-PL")} zł` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1">{item.label}</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Postęp i logi */}
      {(job.status === "running" || job.status === "done" || job.status === "failed") && (() => {
        const isDone      = job.status === "done";
        const fdsProgress = job.fdsLog ? parseFdsProgress(job.fdsLog, job.tEnd) : null;
        const stats       = job.fdsLog ? parseFdsStats(job.fdsLog) : null;

        // Czas trwania — dla done: od startu do zakończenia; dla running: od startu do teraz
        const elapsedSec = job.startedAt
          ? ((isDone && job.completedAt ? new Date(job.completedAt) : new Date()).getTime()
             - new Date(job.startedAt).getTime()) / 1000
          : null;

        // Szacunek z wallHours gdy FDS jeszcze nie wysłał timestepów (tylko podczas running)
        const wallEstPct =
          !isDone && !fdsProgress && elapsedSec != null && job.wallHours > 0
            ? Math.min(90, (elapsedSec / (job.wallHours * 3600)) * 100)
            : null;

        const displayPct = isDone ? 100 : (fdsProgress?.pct ?? wallEstPct);
        const isEstimate = !isDone && !fdsProgress && wallEstPct != null;

        // Czas pozostały
        let remainingStr = "—";
        if (!isDone && fdsProgress && elapsedSec && fdsProgress.pct > 1) {
          const remSec = Math.max(0, Math.round(elapsedSec / fdsProgress.pct * (100 - fdsProgress.pct)));
          remainingStr = remSec < 60 ? `${remSec} s` : `${Math.ceil(remSec / 60)} min`;
        } else if (!isDone && wallEstPct && elapsedSec && wallEstPct > 1) {
          const remSec = Math.max(0, Math.round(elapsedSec / wallEstPct * (100 - wallEstPct)));
          remainingStr = remSec < 60 ? `~${remSec} s` : `~${Math.ceil(remSec / 60)} min`;
        }

        // Ostatnie linie logu — filtruj tylko linie FDS (nie linie runnera "[HH:MM:SS]")
        const logTail = job.fdsLog
          ? job.fdsLog.split("\n").filter(l => l.trim() && !/^\[?\d{2}:\d{2}:\d{2}\]?/.test(l)).slice(-6).join("\n")
            || job.fdsLog.split("\n").filter(Boolean).slice(-6).join("\n")
          : null;

        return (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827]">

            {/* Nagłówek */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Postęp obliczeń</span>
                {job.status === "running" && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">odświeżanie co 15 s</span>
                )}
              </div>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold">
                {(["basic", "advanced"] as const).map((mode) => (
                  <button key={mode} onClick={() => setLogMode(mode)}
                    className={`px-3 py-1.5 transition-colors ${logMode === mode ? "bg-primary text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    {mode === "basic" ? "Podstawowy" : "Zaawansowany"}
                  </button>
                ))}
              </div>
            </div>

            {logMode === "basic" ? (
              <div className="p-5 space-y-4">

                {/* Karty czasowe */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Czas trwania",
                      value: elapsedSec != null
                        ? elapsedSec < 60 ? `${Math.round(elapsedSec)} s`
                          : elapsedSec < 3600 ? `${Math.floor(elapsedSec / 60)} min`
                          : `${(elapsedSec / 3600).toFixed(1)} h`
                        : "—",
                    },
                    {
                      label: "Postęp symulacji",
                      value: isDone
                        ? `${job.tEnd} / ${job.tEnd} s`
                        : fdsProgress
                          ? `${fdsProgress.currentTime.toFixed(2)} / ${job.tEnd} s`
                          : job.status === "running" ? "inicjalizacja FDS…" : "—",
                    },
                    {
                      label: isEstimate ? "Wykonano (szac.)" : "Wykonano",
                      value: displayPct != null ? `${displayPct.toFixed(1)}%` : "—",
                    },
                    {
                      label: "Pozostało",
                      value: isDone ? "zakończono" : remainingStr,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-4 py-3">
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">{item.label}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {displayPct != null && (
                  <div>
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-green-500" : fdsProgress ? "bg-amber-500" : "bg-slate-400"}`}
                        style={{ width: `${displayPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-400">
                      <span>0 s</span>
                      <span className="text-slate-300 dark:text-slate-600 italic">
                        {isEstimate ? "szacunkowy postęp" : ""}
                      </span>
                      <span>{job.tEnd} s</span>
                    </div>
                  </div>
                )}

                {/* Szczegóły FDS */}
                {stats && (stats.version || stats.currentStep != null) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Wersja FDS",    value: stats.version ?? "—" },
                      { label: "CHID",          value: stats.chid ?? "—" },
                      { label: "Krok timestep", value: stats.currentStep != null ? `#${stats.currentStep}` : "—" },
                      { label: "Δt kroku",      value: stats.stepSize != null ? `${stats.stepSize.toExponential(2)} s` : "—" },
                      { label: "Prędkość",      value: stats.iteRate && stats.iteRate !== "nan" ? `${parseFloat(stats.iteRate).toFixed(1)} it/s` : "—" },
                      { label: "Siatki MPI",    value: stats.meshCount != null ? String(stats.meshCount) : "—" },
                      { label: "Komórki",       value: stats.totalCells != null ? stats.totalCells.toLocaleString("pl-PL") : "—" },
                      { label: "Start FDS",     value: stats.startTime ?? "—" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{item.label}</p>
                        <p className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Podgląd ostatnich linii logu */}
                {logTail && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                      Ostatnie zdarzenia
                    </p>
                    <div className="rounded-lg bg-slate-900 dark:bg-black p-3">
                      <pre className="text-[11px] font-mono text-green-400 leading-relaxed whitespace-pre-wrap">{logTail}</pre>
                    </div>
                  </div>
                )}

                {!job.fdsLog && job.status === "running" && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                    Oczekiwanie na pierwsze dane z serwera… (pojawią się po ~15 s od startu FDS)
                  </p>
                )}
              </div>
            ) : (
              /* Zaawansowany — pełny terminal ze scrollem */
              <div className="p-5">
                <div
                  ref={termRef}
                  className="rounded-lg bg-slate-900 dark:bg-black p-3 text-[11px] font-mono text-green-400 leading-relaxed whitespace-pre-wrap break-all"
                  style={{ height: "480px", overflowY: "scroll" }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    termScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 60;
                  }}
                >
                  {job.fdsLog ?? "Oczekiwanie na dane z serwera…"}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Wyniki */}
      {job.status === "done" && job.results && job.results.length > 0 && (
        <div className="rounded-2xl border border-green-200 dark:border-green-800/40 bg-white dark:bg-[#111827] p-6">
          {/* Nagłówek z akcjami */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary cursor-pointer"
              />
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Pliki wynikowe
                <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal">
                  ({job.results.length})
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const toDownload = allFiles.filter((f) => selected.has(f.name));
                  if (toDownload.length === 1) downloadFile(toDownload[0]);
                  else downloadZip(toDownload);
                }}
                disabled={!someSelected || zipping}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Pobierz zaznaczone
              </button>
              <button
                onClick={() => downloadZip(allFiles)}
                disabled={zipping}
                className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {zipping ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {zipping ? "Pakuję…" : "ZIP (wszystkie)"}
              </button>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-2 pr-3 w-8" />
                <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Plik</th>
                <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-4 hidden sm:table-cell">Typ</th>
                <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-4 hidden sm:table-cell">Utworzono</th>
                <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-4">Rozmiar</th>
                <th className="pb-2 pl-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {job.results.map((f) => (
                <tr key={f.name} className="group">
                  <td className="py-2.5 pr-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(f.name)}
                      onChange={() => toggleFile(f.name)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 align-middle min-w-0 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-base leading-none">{fileIcon(f.name)}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 sm:hidden pl-6">{fileType(f.name)}</p>
                  </td>
                  <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    {fileType(f.name)}
                  </td>
                  <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-xs font-mono text-slate-400 dark:text-slate-500 hidden sm:table-cell">
                    {f.createdAt
                      ? new Date(f.createdAt).toLocaleString("pl-PL", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-xs font-mono text-slate-400 dark:text-slate-500 text-right">
                    {formatSize(f.size)}
                  </td>
                  <td className="py-2.5 pl-4 align-middle text-right">
                    <button
                      onClick={() => downloadFile(f)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Pobierz
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kontakt przy błędzie */}
      {job.status === "failed" && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-5 flex items-start gap-4">
          <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Obliczenia zakończyły się błędem.</p>
            <p className="text-xs text-red-600/80 dark:text-red-500 mt-1">
              Skontaktuj się z nami podając numer zlecenia:{" "}
              <a href="mailto:biuro@fp-solutions.pl" className="underline">biuro@fp-solutions.pl</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
