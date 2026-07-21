"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import LiveCharts from "./LiveCharts";
import SliceView from "./SliceView";
import { serverSpec, type FdsDevc } from "@/lib/fds/parser";
import type { FdsSliceJson } from "@/lib/fds/slice";
import { explainFdsErrors, type FdsErrorInfo } from "@/lib/fds/errors";

interface JobData {
  caseId: string;
  status: "pending" | "dispatched" | "running" | "done" | "failed" | "cancelled";
  fileName: string;
  totalCells: number;
  meshCount: number | null;
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
  fdsExitCode: number | null;
  devcCsv: string | null;
  hrrCsv: string | null;
  sliceJson: FdsSliceJson | null;
  devcSetpoints: FdsDevc[] | null;
  stopRequested: boolean;
  results: Array<{ name: string; url: string; size: number | null; createdAt: string | null }> | null;
  paymentStatus: "paid" | "pending" | null;
}

// Karty z wyjaśnieniem błędów FDS (co oznacza + jak naprawić) — treść jest już
// zlokalizowana przez explainFdsErrors(log, locale).
function FdsErrorCards({ errors }: { errors: FdsErrorInfo[] }) {
  const t = useTranslations("symDetail");
  if (!errors.length) return null;
  return (
    <div className="space-y-2">
      {errors.map((e, i) => (
        <div key={i} className="rounded-md border border-red-200 dark:border-red-800/50 bg-white/70 dark:bg-[#0B1120]/50 p-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            {e.code && (
              <span className="font-mono text-[10px] mr-1.5 rounded bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 align-middle">
                {t("errorCode")} {e.code}
              </span>
            )}
            {e.title}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{e.explanation}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{t("failed.howToFix")}</span> {e.hint}
          </p>
        </div>
      ))}
    </div>
  );
}

function hasFatalFdsError(log: string | null): boolean {
  if (!log) return false;
  return /improperly set-?up|forrtl:\s*severe|\bFatal error\b/i.test(log);
}

function extractErrorLines(log: string | null): string[] {
  if (!log) return [];
  const rx = /\b(error|fatal|forrtl|severe|abort|cannot|not found|failed|denied|no such)\b/i;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of log.split("\n")) {
    const l = raw.trim();
    if (!l || !rx.test(l) || seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out.slice(-12);
}

// Wyłącznie klasy kolorów/tła statusu — etykiety i opisy pochodzą z tłumaczeń.
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  pending:    { color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800/60", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400 animate-pulse" },
  dispatched: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/50", dot: "bg-blue-500 animate-pulse" },
  running:    { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800/50", dot: "bg-amber-500 animate-pulse" },
  done:       { color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800/50", dot: "bg-green-500" },
  failed:     { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800/50", dot: "bg-red-500" },
  cancelled:  { color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800/60", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
};

function formatCells(n: number, thousands: string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} ${thousands}`;
  return String(n);
}

function elapsed(from: string | null): string {
  if (!from) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

function fileIcon(name: string) {
  if (name.endsWith(".smv")) return "📊";
  if (name.endsWith(".csv")) return "📄";
  if (name.endsWith(".log")) return "📋";
  return "📁";
}

function fileTypeKey(name: string): string {
  if (name.endsWith(".smv"))  return "smv";
  if (name.endsWith(".csv"))  return "csv";
  if (name.endsWith(".log"))  return "log";
  if (name.endsWith(".s3d"))  return "s3d";
  if (name.endsWith(".q"))    return "q";
  if (name.endsWith(".sf"))   return "sf";
  if (name.endsWith(".bf"))   return "bf";
  if (name.endsWith(".prt5")) return "prt5";
  if (name.endsWith(".fds"))  return "fds";
  return "other";
}

function parseFdsProgress(log: string, tEnd: number): { pct: number; currentTime: number } | null {
  const matches = Array.from(log.matchAll(/Simulation Time:\s*([\d.E+\-]+)\s*s/g));
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

  const tsMatches = Array.from(
    log.matchAll(/Time Step:\s*(\d+),\s*Simulation Time:\s*([\d.E+\-]+)\s*s/g)
  );
  const lastTs      = tsMatches[tsMatches.length - 1];
  const currentStep = lastTs ? parseInt(lastTs[1]) : null;
  const currentTime = lastTs ? parseFloat(lastTs[2]) : null;

  let stepSize: number | null = null;
  if (tsMatches.length >= 2) {
    const prev = tsMatches[tsMatches.length - 2];
    const last = tsMatches[tsMatches.length - 1];
    const dTime  = parseFloat(last[2]) - parseFloat(prev[2]);
    const dSteps = parseInt(last[1]) - parseInt(prev[1]);
    if (dSteps > 0 && dTime > 0) stepSize = dTime / dSteps;
  }

  const detailMatch = log.match(/Step Size:\s*([\d.E+\-]+)\s*s/);
  if (detailMatch) stepSize = parseFloat(detailMatch[1]);

  const iteRateMatch = log.match(/Ite Rate\/Proc:\s*([\d.E+\-nan]+)/);
  const iteRate = iteRateMatch?.[1] ?? null;

  const meshLines = Array.from(log.matchAll(/Number of Grid Cells\s+([\d,\s]+)/g));
  const totalCells = meshLines.length
    ? meshLines.reduce((s, m) => s + parseInt(m[1].replace(/[\s,]/g, "")), 0)
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

function formatDt(s: number | null): string {
  if (s === null) return "—";
  if (s >= 1)    return `${s.toFixed(3)} s`;
  if (s >= 0.01) return `${(s * 1000).toFixed(1)} ms`;
  return `${(s * 1000).toFixed(2)} ms`;
}

function formatDuration(sec: number): string {
  if (sec < 60)   return `${Math.round(sec)} s`;
  if (sec < 3600) return `${Math.ceil(sec / 60)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
}

export default function JobStatusPage({ params }: { params: { caseId: string } }) {
  const { caseId } = params;
  const t = useTranslations("symDetail");
  const locale = useLocale();
  const numLocale = locale === "en" ? "en-GB" : "pl-PL";
  const errLocale = locale === "en" ? "en" : "pl";
  const cur = locale === "en" ? "PLN" : "zł";
  const money = (n: number, dec = false) =>
    `${n.toLocaleString(numLocale, dec ? { minimumFractionDigits: 2 } : undefined)} ${cur}`;
  const mins = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);

  const router = useRouter();
  const searchParams = useSearchParams();
  const platnosc = searchParams.get("platnosc");
  const [job, setJob] = useState<JobData | null>(null);
  const [error, setError] = useState<"not_found" | "connection" | null>(null);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dlMsg, setDlMsg] = useState<string | null>(null);
  const [logMode, setLogMode] = useState<"basic" | "advanced">("basic");
  const termRef = useRef<HTMLDivElement>(null);
  const termScrolledUpRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [paying, setPaying] = useState(false);
  const [finalCsv, setFinalCsv] = useState<{ devc: string | null; hrr: string | null }>({ devc: null, hrr: null });

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch(`/api/symulacje/${caseId}/stop`, { method: "POST" });
      if (res.ok) setJob((j) => (j ? { ...j, stopRequested: true } : j));
    } finally {
      setStopping(false);
      setConfirmCancel(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/symulacje/${caseId}`, { method: "DELETE" });
      if (res.ok) router.push("/symulacje/historia");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await fetch("/api/platnosci/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (platnosc === "sukces") {
      fetch(`/api/platnosci/verify?caseId=${caseId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.payment_status === "paid") setJob((j) => (j ? { ...j, paymentStatus: "paid" } : j));
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platnosc]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/symulacje/${caseId}`);
      if (res.status === 404) { setError("not_found"); return; }
      if (res.status === 500) { setError("connection"); return; }
      if (!res.ok) { setError("connection"); return; }
      const data: JobData = await res.json();
      setJob(data);
      if (["done", "failed", "cancelled"].includes(data.status)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {
      setError("connection");
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(() => {
      setTick((n) => n + 1);
      fetchStatus();
    }, 3_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (logMode === "advanced" && termRef.current && !termScrolledUpRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.fdsLog, logMode]);

  useEffect(() => {
    if (job?.status !== "done" || !job.results?.length) return;
    const devcF = job.results.find((f) => f.name.toLowerCase().endsWith("_devc.csv"));
    const hrrF = job.results.find((f) => f.name.toLowerCase().endsWith("_hrr.csv"));
    if (!devcF && !hrrF) return;
    let cancelled = false;
    // Doczytywanie pełnych CSV przez proxy (same-origin) — nie wprost z magazynu,
    // żeby uniknąć blokady CORS (jak przy pobieraniu plików / ZIP).
    const load = async (name?: string) => {
      if (!name) return null;
      try {
        return await (await fetch(`/api/symulacje/${caseId}/download?file=${encodeURIComponent(name)}`)).text();
      } catch { return null; }
    };
    (async () => {
      const [devc, hrr] = await Promise.all([load(devcF?.name), load(hrrF?.name)]);
      if (!cancelled) setFinalCsv({ devc, hrr });
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, job?.results]);

  const allFiles = job?.results ?? [];
  const allSelected = allFiles.length > 0 && allFiles.every((f) => selected.has(f.name));
  const someSelected = allFiles.some((f) => selected.has(f.name));

  const toggleFile = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allFiles.map((f) => f.name)));

  // Pobieranie przez własny proxy (same-origin) — omija CORS magazynu Hetzner.
  const proxyUrl = (name: string) =>
    `/api/symulacje/${caseId}/download?file=${encodeURIComponent(name)}`;

  // Pobranie pojedynczego pliku. Preferuj BEZPOŚREDNI podpisany URL (magazyn wymusza
  // pobranie przez ResponseContentDisposition) — przeglądarka strumieniuje wprost na
  // dysk, bez obciążania serwera i bez limitów funkcji. Proxy jako fallback.
  const downloadFile = (f: { name: string; url?: string }) => {
    const a = document.createElement("a");
    a.href = f.url ?? proxyUrl(f.name);
    a.download = f.name;
    a.rel = "noopener";
    a.click();
  };

  // Paczka ZIP budowana STRUMIENIOWO po stronie serwera — działa dla dowolnego
  // rozmiaru (nic nie ląduje w pamięci przeglądarki). Kotwica z download uruchamia
  // pobranie; strona nie nawiguje (Content-Disposition: attachment).
  const packageHref = (names?: string[]) => {
    const q = names && names.length ? `?files=${encodeURIComponent(names.join(","))}` : "";
    return `/api/symulacje/${caseId}/download-zip${q}`;
  };
  const downloadPackage = (names?: string[]) => {
    setDlMsg(t("results.preparingZip"));
    const a = document.createElement("a");
    a.href = packageHref(names);
    a.download = `${caseId}.zip`;
    a.click();
    setTimeout(() => setDlMsg(null), 5000);
  };

  // ── Stany brzegowe ──────────────────────────────────────────────────────────
  if (error === "not_found") return (
    <section className="relative z-10 bg-slate-50 dark:bg-[#0B1120] min-h-screen py-10">
      <div className="container max-w-3xl">
        <div className="py-16 text-center">
          <p className="text-7xl font-black text-slate-100 dark:text-slate-800 select-none leading-none mb-6">404</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("notFound.title")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t("notFound.body", { caseId })}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">{t("notFound.hint")}</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/symulacje/historia" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
              {t("notFound.history")}
            </Link>
            <Link href="/symulacje" className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {t("notFound.newJob")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  if (error === "connection") return (
    <section className="relative z-10 bg-slate-50 dark:bg-[#0B1120] min-h-screen py-10">
      <div className="container max-w-3xl">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <p className="font-semibold text-red-700 dark:text-red-400 mb-1">{t("conn.title")}</p>
          <p className="text-sm text-red-600/70 dark:text-red-500/70 mb-4">{t("conn.body")}</p>
          <Link href="/symulacje" className="text-sm font-medium text-primary hover:underline">{t("conn.back")}</Link>
        </div>
      </div>
    </section>
  );

  if (!job) return (
    <section className="relative z-10 bg-slate-50 dark:bg-[#0B1120] min-h-screen py-10">
      <div className="container max-w-3xl space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    </section>
  );

  const fatalErr = hasFatalFdsError(job.fdsLog);
  const isRunning = job.status === "running";
  const effectiveFailed = job.status === "failed" || (isRunning && fatalErr);
  const displayStatus = effectiveFailed ? "failed" : job.status;

  const cfg = STATUS_STYLE[displayStatus];
  const statusLabel = t(`status.${displayStatus}.label`);
  const statusDesc = t(`status.${displayStatus}.desc`);
  const isActive = (job.status === "running" || job.status === "dispatched") && !fatalErr;
  const canCancel = ["pending", "dispatched", "running"].includes(job.status);
  const isTerminal = ["done", "failed", "cancelled"].includes(job.status);

  // Wspólny styl kart sekcji — spójna otoczka w całej stronie
  const cardCls = "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E]";

  return (
    <section className="relative z-10 bg-slate-50 dark:bg-[#0B1120] min-h-screen py-10">
      <div className="container max-w-3xl">
        <div className="space-y-5" suppressHydrationWarning>

          {/* Header */}
          <div>
            <Link href="/symulacje" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {t("back")}
            </Link>
            <div className="mt-2 flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700/70 pb-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{job.fileName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{job.caseId}</span>
                  {job.serverType && (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      {serverSpec(job.serverType).label}
                    </span>
                  )}
                </div>
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${cfg.bg} ${cfg.color} shrink-0`}>
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                {statusLabel}
              </div>
            </div>
          </div>

          {/* Status card */}
          <div className={`rounded-xl border p-5 ${cfg.bg} ${cfg.border}`}>
            <p className={`text-sm font-semibold ${cfg.color}`}>{statusDesc}</p>
            {isActive && job.dispatchedAt && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {t("card.sinceAccepted")} <span className="font-mono font-bold">{elapsed(job.dispatchedAt)}</span>
                {job.status === "running" && job.startedAt && (
                  <span className="ml-3">· {t("card.fdsSince")} <span className="font-mono font-bold">{elapsed(job.startedAt)}</span></span>
                )}
                {job.wallHours > 0 && (
                  <span className="ml-2 text-slate-500 dark:text-slate-400">/ {t("card.estimated")} {mins(job.wallHours)}</span>
                )}
              </p>
            )}
            {job.status === "done" && job.completedAt && job.dispatchedAt && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {t("card.totalTime")} <span className="font-mono font-bold">{elapsed(job.dispatchedAt)}</span>
              </p>
            )}
            {job.serverType && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {t("card.machine")} <span className="font-mono font-bold">{serverSpec(job.serverType).label}</span>
                <span className="ml-1 text-slate-400 dark:text-slate-500">{t("card.machineNote")}</span>
              </p>
            )}
          </div>

          {/* Akcje */}
          {(canCancel || isTerminal) && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {isRunning && !fatalErr && (
                  job.stopRequested ? (
                    <span className="flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                      {t("actions.stopping")}
                    </span>
                  ) : confirmCancel ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 flex-wrap">
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("actions.confirmStopQ")}</span>
                      <button onClick={handleStop} disabled={stopping} className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-60">
                        {stopping ? t("actions.stopping") : t("actions.yesStop")}
                      </button>
                      <button onClick={() => setConfirmCancel(false)} disabled={stopping} className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60">
                        {t("actions.no")}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setConfirmCancel(true); setConfirmDelete(false); }} className="flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2z" /></svg>
                      {t("actions.stop")}
                    </button>
                  )
                )}

                {confirmDelete ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 w-full">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      {canCancel ? t("actions.confirmDeleteActive") : t("actions.confirmDelete")}
                    </p>
                    <p className="text-xs text-red-600/90 dark:text-red-400/90">
                      {canCancel ? t("actions.deleteActiveBody") : t("actions.deleteBody")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-60">
                        {deleting ? t("actions.deleting") : canCancel ? t("actions.yesStopDelete") : t("actions.yesDelete")}
                      </button>
                      <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60">
                        {t("actions.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setConfirmDelete(true); setConfirmCancel(false); }} className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    {canCancel ? t("actions.stopAndDelete") : t("actions.deleteJob")}
                  </button>
                )}
              </div>

              {!confirmDelete && !confirmCancel && !job.stopRequested && (
                <ul className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 space-y-1">
                  {isRunning && !fatalErr && (
                    <li>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{t("actions.annStopBold")}</span> — {t("actions.annStop")}
                    </li>
                  )}
                  <li>
                    <span className="font-semibold text-red-600 dark:text-red-400">{canCancel ? t("actions.stopAndDelete") : t("actions.deleteJob")}</span> — {t("actions.annDelete")}
                    {canCancel && ` ${t("actions.annDeleteActive")}`}
                  </li>
                </ul>
              )}

              {isRunning && job.stopRequested && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
                  <svg className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("actions.softStopTitle")}</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">{t("actions.softStopBody")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className={`${cardCls} p-5`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{t("timeline.title")}</h2>
            <div className="space-y-3">
              {([
                { key: "pending", label: t("timeline.accepted"), time: null as string | null },
                { key: "dispatched", label: t("timeline.serverUp"), time: job.dispatchedAt },
                { key: "running", label: t("timeline.fds"), time: job.startedAt },
                { key: "done", label: t("timeline.resultsReady"), time: job.completedAt },
              ]).map((step) => {
                const statuses = ["pending", "dispatched", "running", "done", "failed"];
                const stepIdx = statuses.indexOf(step.key);
                const currentIdx = statuses.indexOf(job.status);
                const done = stepIdx < currentIdx || (step.key === "done" && job.status === "done");
                const active = step.key === job.status;
                const failed = job.status === "failed" && stepIdx === currentIdx;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                      failed ? "bg-red-100 dark:bg-red-900/40" : done ? "bg-green-100 dark:bg-green-900/40" : active ? "bg-primary/10" : "bg-slate-100 dark:bg-slate-700"
                    }`}>
                      {done ? (
                        <svg className="h-3 w-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : active ? (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                      )}
                    </div>
                    <span className={`text-sm ${done || active ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{step.label}</span>
                    {step.time && (
                      <span className="ml-auto text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {new Date(step.time).toLocaleTimeString(numLocale, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model details tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ...(job.serverType ? [{ label: t("tiles.machine"), value: serverSpec(job.serverType).label }] : []),
              { label: t("tiles.cells"), value: formatCells(job.totalCells, t("tiles.thousands")) },
              { label: t("tiles.simTime"), value: `${job.tEnd} s` },
              { label: t("tiles.vcpuHours"), value: job.vcpuHours.toFixed(1) },
              { label: t("tiles.netPrice"), value: money(job.price) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white dark:bg-[#1E232E] border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{item.label}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Postęp i logi */}
          {(job.status === "running" || job.status === "done" || job.status === "failed") && (() => {
            const isDone      = job.status === "done";
            const fdsProgress = job.fdsLog ? parseFdsProgress(job.fdsLog, job.tEnd) : null;
            const stats       = job.fdsLog ? parseFdsStats(job.fdsLog) : null;
            const elapsedSec = job.startedAt
              ? ((isDone && job.completedAt ? new Date(job.completedAt) : new Date()).getTime() - new Date(job.startedAt).getTime()) / 1000
              : null;
            const wallEstPct = !isDone && !fdsProgress && elapsedSec != null && job.wallHours > 0
              ? Math.min(90, (elapsedSec / (job.wallHours * 3600)) * 100) : null;
            const displayPct = isDone ? 100 : (fdsProgress?.pct ?? wallEstPct);
            const isEstimate = !isDone && !fdsProgress && wallEstPct != null;

            let remainingStr = "—";
            if (!isDone && fdsProgress && elapsedSec && fdsProgress.pct > 1) {
              const remSec = Math.max(0, Math.round(elapsedSec / fdsProgress.pct * (100 - fdsProgress.pct)));
              remainingStr = remSec < 60 ? `${remSec} s` : `${Math.ceil(remSec / 60)} min`;
            } else if (!isDone && wallEstPct && elapsedSec && wallEstPct > 1) {
              const remSec = Math.max(0, Math.round(elapsedSec / wallEstPct * (100 - wallEstPct)));
              remainingStr = remSec < 60 ? `~${remSec} s` : `~${Math.ceil(remSec / 60)} min`;
            }

            const logTail = job.fdsLog
              ? job.fdsLog.split("\n").filter((l) => l.trim() && !/^\[?\d{2}:\d{2}:\d{2}\]?/.test(l)).slice(-6).join("\n")
                || job.fdsLog.split("\n").filter(Boolean).slice(-6).join("\n")
              : null;

            return (
              <div className={cardCls}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("progress.title")}</span>
                    {job.status === "running" && <span className="text-[10px] text-slate-500 dark:text-slate-400">{t("progress.refresh")}</span>}
                  </div>
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-semibold">
                    {(["basic", "advanced"] as const).map((mode) => (
                      <button key={mode} onClick={() => setLogMode(mode)} className={`px-3 py-1.5 transition-colors ${logMode === mode ? "bg-primary text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                        {mode === "basic" ? t("progress.basic") : t("progress.advanced")}
                      </button>
                    ))}
                  </div>
                </div>

                {logMode === "basic" ? (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: t("progress.duration"), value: elapsedSec != null ? (elapsedSec < 60 ? `${Math.round(elapsedSec)} s` : elapsedSec < 3600 ? `${Math.floor(elapsedSec / 60)} min` : `${(elapsedSec / 3600).toFixed(1)} h`) : "—" },
                        { label: t("progress.simProgress"), value: isDone ? `${job.tEnd} / ${job.tEnd} s` : fdsProgress ? `${fdsProgress.currentTime.toFixed(2)} / ${job.tEnd} s` : job.status === "running" ? t("progress.fdsInit") : "—" },
                        { label: isEstimate ? t("progress.doneEst") : t("progress.doneLabel"), value: displayPct != null ? `${displayPct.toFixed(1)}%` : "—" },
                        { label: t("progress.remaining"), value: isDone ? t("progress.finished") : remainingStr },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-slate-700 px-4 py-3">
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">{item.label}</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {displayPct != null && (
                      <div>
                        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-green-500" : fdsProgress ? "bg-primary" : "bg-slate-400"}`} style={{ width: `${displayPct}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          <span>0 s</span>
                          <span className="text-slate-300 dark:text-slate-600 italic">{isEstimate ? t("progress.estProgress") : ""}</span>
                          <span>{job.tEnd} s</span>
                        </div>
                      </div>
                    )}

                    {stats && (stats.version || stats.currentStep != null || job.meshCount != null) && (() => {
                      const estimatedTotalSec = !isDone && fdsProgress && elapsedSec && fdsProgress.pct > 2 ? elapsedSec / (fdsProgress.pct / 100) : null;
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: t("progress.fdsVersion"), value: stats.version ?? "—" },
                            { label: t("progress.chid"), value: stats.chid ?? "—" },
                            { label: t("progress.timestep"), value: stats.currentStep != null ? `#${stats.currentStep}` : "—" },
                            { label: t("progress.dtStep"), value: formatDt(stats.stepSize) },
                            { label: t("progress.predTime"), value: isDone ? t("progress.finished") : estimatedTotalSec ? formatDuration(estimatedTotalSec) : "—" },
                            { label: t("progress.mpiMeshes"), value: (stats.meshCount ?? job.meshCount) != null ? String(stats.meshCount ?? job.meshCount) : "—" },
                            { label: t("progress.cells"), value: (stats.totalCells ?? job.totalCells) != null ? (stats.totalCells ?? job.totalCells)!.toLocaleString(numLocale) : "—" },
                            { label: t("progress.fdsStart"), value: stats.startTime ?? "—" },
                          ].map((item) => (
                            <div key={item.label} className="rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-slate-700 px-3 py-2">
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">{item.label}</p>
                              <p className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {logTail && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">{t("progress.lastEvents")}</p>
                        <div className="rounded-lg bg-slate-900 p-3"><pre className="text-[11px] font-mono text-green-400 leading-relaxed whitespace-pre-wrap">{logTail}</pre></div>
                      </div>
                    )}

                    {!job.fdsLog && job.status === "running" && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">{t("progress.waitingFirst")}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-5">
                    <div ref={termRef} className="rounded-lg bg-slate-900 p-3 text-[11px] font-mono text-green-400 leading-relaxed whitespace-pre-wrap break-all" style={{ height: "480px", overflowY: "scroll" }}
                      onScroll={(e) => { const el = e.currentTarget; termScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 60; }}>
                      {job.fdsLog ?? t("progress.waitingData")}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Podgląd przekroju na żywo */}
          {(job.status === "running" || job.status === "done" || job.status === "failed") && (
            <SliceView slice={job.sliceJson} running={isRunning && !fatalErr} caseId={job.caseId} done={job.status === "done"} />
          )}

          {/* Wyniki na żywo — wykresy DEVC / HRR */}
          {(job.status === "running" || job.status === "done" || job.status === "failed") && (
            <LiveCharts devcCsv={finalCsv.devc ?? job.devcCsv} hrrCsv={finalCsv.hrr ?? job.hrrCsv} setpoints={job.devcSetpoints} running={isRunning && !fatalErr} />
          )}

          {/* Gotowe, ale w logu FDS są błędy */}
          {job.status === "done" && (() => {
            const explained = explainFdsErrors(job.fdsLog, errLocale);
            if (explained.length === 0) return null;
            return (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 flex items-start gap-4">
                <svg className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" /></svg>
                <div className="min-w-0 w-full">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("warn.title")}</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">{t("warn.body")}</p>
                  <div className="mt-3"><FdsErrorCards errors={explained} /></div>
                </div>
              </div>
            );
          })()}

          {/* Wyniki */}
          {job.status === "done" && job.results && job.results.length > 0 && (
            <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-white dark:bg-[#1E232E] p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-primary cursor-pointer" />
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("results.title")}
                    <span className="ml-1.5 text-slate-500 dark:text-slate-400 font-normal">({job.results.length})</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { const sel = allFiles.filter((f) => selected.has(f.name)); if (sel.length === 1) downloadFile(sel[0]); else downloadPackage(sel.map((f) => f.name)); }} disabled={!someSelected} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {t("results.downloadSelected")}
                  </button>
                  <button onClick={() => downloadPackage()} className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {t("results.zipAll")}
                  </button>
                </div>
              </div>

              {dlMsg && <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">{dlMsg}</p>}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="pb-2 pr-3 w-8" />
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("results.thFile")}</th>
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-4 hidden sm:table-cell">{t("results.thType")}</th>
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-4 hidden sm:table-cell">{t("results.thCreated")}</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-4">{t("results.thSize")}</th>
                      <th className="pb-2 pl-4 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {job.results.map((f) => (
                      <tr key={f.name} className="group">
                        <td className="py-2.5 pr-3 align-middle">
                          <input type="checkbox" checked={selected.has(f.name)} onChange={() => toggleFile(f.name)} className="h-4 w-4 rounded border-slate-300 text-primary cursor-pointer" />
                        </td>
                        <td className="py-2.5 align-middle min-w-0 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-base leading-none">{fileIcon(f.name)}</span>
                            <span className="font-mono text-slate-700 dark:text-slate-200 truncate">{f.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:hidden pl-6">{t(`fileType.${fileTypeKey(f.name)}`)}</p>
                        </td>
                        <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">{t(`fileType.${fileTypeKey(f.name)}`)}</td>
                        <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString(numLocale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400 text-right">{formatSize(f.size)}</td>
                        <td className="py-2.5 pl-4 align-middle text-right">
                          <button onClick={() => downloadFile(f)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {t("results.download")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Płatność */}
          {job.status === "done" && (
            <div className={`rounded-xl border p-5 ${job.paymentStatus === "paid" ? "border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20" : "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20"}`}>
              {platnosc === "sukces" && job.paymentStatus !== "paid" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">{t("payment.verifying")}</p>
              )}
              {platnosc === "anulowano" && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">{t("payment.cancelledMsg")}</p>
              )}

              {job.paymentStatus === "paid" ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 shrink-0">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">{t("payment.done")}</p>
                    <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">
                      {t("payment.amount")} <span className="font-semibold">{money(job.price, true)}</span> {t("payment.net")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t("payment.awaiting")}</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5">
                      {t("payment.toPay")} <span className="font-bold">{money(job.price, true)}</span> {t("payment.net")}
                      <span className="ml-1 text-amber-500/70 dark:text-amber-600">(~{money(job.price * 1.23, true)} {t("payment.gross")})</span>
                    </p>
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-500 mt-1">{t("payment.note")}</p>
                  </div>
                  <button onClick={handlePay} disabled={paying} className="flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0">
                    {paying ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    )}
                    {paying ? t("payment.redirecting") : t("payment.pay", { amount: money(job.price, true) })}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Anulowano */}
          {job.status === "cancelled" && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-5 flex items-start gap-4">
              <svg className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("cancelled.title")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("cancelled.body")}</p>
              </div>
            </div>
          )}

          {/* Błąd */}
          {effectiveFailed && (() => {
            const launchFailure = !job.startedAt;
            const stillRunning = job.status !== "failed";
            const errLines = extractErrorLines(job.fdsLog);
            const explained = explainFdsErrors(job.fdsLog, errLocale);
            return (
              <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-5 flex items-start gap-4">
                <svg className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="min-w-0 w-full">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {launchFailure ? t("failed.launchTitle") : t("failed.interruptedTitle")}
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-500 mt-1">
                    {launchFailure ? t("failed.launchBody") : t("failed.interruptedBody")}
                    {stillRunning && ` ${t("failed.serverFinishing")}`}
                    {job.fdsExitCode != null && <> {" "}{t("failed.exitCode", { code: job.fdsExitCode })}</>}
                  </p>

                  {explained.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">{t("failed.whatMeans")}</p>
                      <FdsErrorCards errors={explained} />
                    </div>
                  )}

                  {errLines.length > 0 && (
                    <details className="mt-3" open={explained.length === 0}>
                      <summary className="text-[11px] font-medium text-red-600/80 dark:text-red-500 cursor-pointer select-none">{t("failed.rawConsole")}</summary>
                      <div className="mt-2 rounded-lg bg-slate-900 p-3 max-h-56 overflow-auto"><pre className="text-[11px] font-mono text-red-300 leading-relaxed whitespace-pre-wrap break-all">{errLines.join("\n")}</pre></div>
                    </details>
                  )}

                  <p className="text-xs text-red-600/80 dark:text-red-500 mt-3">
                    {t("failed.noCharge")}{" "}
                    <a href="mailto:biuro@fp-solutions.pl" className="underline">biuro@fp-solutions.pl</a>
                  </p>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </section>
  );
}
