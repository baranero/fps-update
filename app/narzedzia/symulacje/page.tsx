"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseFds, estimateCost, FdsParseResult, FdsEstimate } from "@/lib/fds/parser";

type Step = "upload" | "review" | "submitting" | "done";

function formatCells(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} tys.`;
  return String(n);
}

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

function complexityColor(c: FdsEstimate["complexity"]) {
  return {
    mała: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    średnia: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    duża: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "bardzo duża": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }[c];
}

export default function SymulacjePage() {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<FdsParseResult | null>(null);
  const [estimate, setEstimate] = useState<FdsEstimate | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [caseId, setCaseId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".fds")) {
      setParseError("Akceptowane są tylko pliki z rozszerzeniem .fds");
      return;
    }
    setFile(f);
    setParseError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const analyze = () => {
    if (!file) return;
    setAnalyzing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseFds(content);
      setParseResult(result);
      if (result.valid) {
        setEstimate(estimateCost(result));
        setStep("review");
      } else {
        setParseError(result.error ?? "Nieznany błąd parsowania.");
      }
      setAnalyzing(false);
    };
    reader.onerror = () => {
      setParseError("Nie udało się odczytać pliku.");
      setAnalyzing(false);
    };
    reader.readAsText(file);
  };

  const submit = async () => {
    if (!file || !parseResult || !estimate) return;
    setStep("submitting");
    setSubmitError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("name", form.name.trim());
      body.append("email", form.email.trim());
      body.append("notes", form.notes.trim());
      body.append("parsed", JSON.stringify(parseResult));
      body.append("estimate", JSON.stringify(estimate));

      const res = await fetch("/api/symulacje/submit", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
        setStep("review");
        return;
      }

      setCaseId(data.caseId);
      setStep("done");
      router.push(`/narzedzia/symulacje/${data.caseId}`);
    } catch {
      setSubmitError("Brak połączenia z serwerem. Spróbuj ponownie.");
      setStep("review");
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParseResult(null);
    setEstimate(null);
    setParseError(null);
    setSubmitError(null);
    setAnalyzing(false);
    setForm({ name: "", email: "", notes: "" });
  };

  const canSubmit = form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Symulacje FDS</h1>
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            Beta
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Wgraj plik wejściowy FDS — system automatycznie oszacuje czas i koszt obliczeń w chmurze.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(["upload", "review", "done"] as const).map((s, i) => {
          const labels = ["1. Plik FDS", "2. Wycena", "3. Potwierdzenie"];
          const active = s === step || (s === "review" && step === "submitting");
          const done =
            (s === "upload" && (step === "review" || step === "submitting" || step === "done")) ||
            (s === "review" && step === "done");
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-6 ${done || active ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />}
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                done
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : active
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                {done ? (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6 space-y-5">
          <h2 className="text-xs font-medium text-slate-500">Wgraj plik FDS</h2>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : file
                ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <input ref={inputRef} type="file" accept=".fds" className="hidden" onChange={onInputChange} />

            {file ? (
              <div className="space-y-1">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                <p className="text-xs text-slate-400 mt-1">Kliknij, aby wybrać inny plik</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Przeciągnij plik lub kliknij, aby wybrać</p>
                <p className="text-xs text-slate-400">Obsługiwane formaty: .fds</p>
              </div>
            )}
          </div>

          {/* Error */}
          {parseError && (
            <div className="flex gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
              <svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
            </div>
          )}

          {/* Info */}
          <div className="flex gap-3 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-950/20 p-4">
            <svg className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-semibold">Co system analizuje?</p>
              <p>Sekcje &amp;MESH (liczba i rozmiar siatek), &amp;TIME (czas symulacji), &amp;REAC (paliwo) oraz elementy modelu (&amp;OBST, &amp;VENT, &amp;DEVC).</p>
              <p>Plik pozostaje lokalny — przesyłany jest dopiero po zatwierdzeniu wyceny.</p>
            </div>
          </div>

          <button
            onClick={analyze}
            disabled={!file || analyzing}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analizuję plik…
              </>
            ) : (
              <>
                Analizuj plik
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Review */}
      {(step === "review" || step === "submitting") && parseResult && estimate && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xs font-medium text-slate-500 mb-1">Analiza pliku</h2>
                <p className="font-bold text-slate-900 dark:text-white">{file?.name}</p>
                {parseResult.chid && (
                  <p className="text-xs text-slate-400 mt-0.5">CHID: {parseResult.chid}</p>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${complexityColor(estimate.complexity)}`}>
                Złożoność: {estimate.complexity}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Rdzenie obliczeniowe",
                  value: String(parseResult.totalCores),
                  sub: parseResult.ompThreads > 1
                    ? `${parseResult.meshCount} MPI × ${parseResult.ompThreads} OMP`
                    : `${parseResult.meshCount} siatek MPI`,
                  icon: (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                    </svg>
                  ),
                },
                {
                  label: "Komórek (łącznie)",
                  value: formatCells(parseResult.totalCells),
                  sub: undefined as string | undefined,
                  icon: (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                    </svg>
                  ),
                },
                {
                  label: "Czas symulacji",
                  value: `${parseResult.tEnd} s`,
                  sub: undefined as string | undefined,
                  icon: (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  label: "Paliwo (REAC)",
                  value: parseResult.fuel ?? "—",
                  sub: undefined as string | undefined,
                  icon: (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    {item.icon}
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{item.value}</p>
                  {item.sub && <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>}
                </div>
              ))}
            </div>

            {parseResult.meshDetails.length > 1 && (
              <div className="mt-4">
                <p className="text-[11px] font-mediumst text-slate-400 mb-2">Szczegóły siatek</p>
                <div className="flex flex-wrap gap-2">
                  {parseResult.meshDetails.map((m, i) => (
                    <span key={i} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                      #{i + 1} {m.ijk[0]}×{m.ijk[1]}×{m.ijk[2]} = {formatCells(m.cells)} komórek
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(parseResult.obstCount > 0 || parseResult.ventCount > 0 || parseResult.devcCount > 0) && (
              <div className="mt-4 flex gap-3 text-xs text-slate-500 dark:text-slate-500">
                {parseResult.obstCount > 0 && <span>Przeszkody (OBST): {parseResult.obstCount}</span>}
                {parseResult.ventCount > 0 && <span>Otwory (VENT): {parseResult.ventCount}</span>}
                {parseResult.devcCount > 0 && <span>Czujniki (DEVC): {parseResult.devcCount}</span>}
              </div>
            )}
          </div>

          {/* Estimate card */}
          <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-6">
            <h2 className="text-xs font-medium text-amber-700 dark:text-amber-500 mb-3">Szacunkowa wycena</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-medium text-amber-600/70 dark:text-amber-500/70 mb-1">Czas obliczeń (zegar ścienny)</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                  {formatHours(estimate.wallHours)}
                </p>
                <p className="text-[11px] text-amber-600/70 dark:text-amber-500 mt-0.5">przy {parseResult.totalCores} rdzeniach obliczeniowych</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-amber-600/70 dark:text-amber-500/70 mb-1">vCPU-hours</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                  {estimate.vcpuHours.toFixed(1)}
                </p>
                <p className="text-[11px] text-amber-600/70 dark:text-amber-500 mt-0.5">
                  ≈ {estimate.cloudCostEur.toFixed(1)} € koszt chmury
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-amber-600/70 dark:text-amber-500/70 mb-1">Koszt netto</p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-200">
                  {estimate.price.toLocaleString("pl-PL")} zł
                </p>
                <p className="text-[11px] text-amber-600/70 dark:text-amber-500 mt-0.5">cena zawiera konfigurację i weryfikację</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-amber-600/70 dark:text-amber-500 border-t border-amber-200/60 dark:border-amber-800/40 pt-3">
              Cena obliczona na podstawie liczby komórek i czasu symulacji. Potwierdzamy ją przed uruchomieniem obliczeń.
            </p>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6 space-y-4">
            <h2 className="text-xs font-medium text-slate-500">Dane kontaktowe</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Imię i nazwisko <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jan Kowalski"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Adres e-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jan@firma.pl"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                Uwagi do zlecenia (opcjonalnie)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Np. nazwa projektu, termin, dodatkowe wymagania…"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {submitError && (
              <div className="flex gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                <svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={submit}
                disabled={!canSubmit || step === "submitting"}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === "submitting" ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Wysyłam zlecenie…
                  </>
                ) : (
                  <>
                    Wyślij do obliczeń
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
              <button
                onClick={reset}
                disabled={step === "submitting"}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                Wróć
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="rounded-2xl border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-950/20 p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Zlecenie przyjęte</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Numer zgłoszenia: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{caseId}</span>
            </p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Inżynier zweryfikuje plik i prześle ostateczną ofertę na adres <strong>{form.email}</strong> przed uruchomieniem obliczeń. Zazwyczaj odpowiadamy w ciągu 1 dnia roboczego.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Wyślij kolejne zlecenie
          </button>
        </div>
      )}
    </div>
  );
}
