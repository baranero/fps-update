"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseFds, estimateCost, FdsParseResult, FdsEstimate } from "@/lib/fds/parser";
import { createClient } from "@/lib/supabase/client";

type Submission = {
  case_id: string;
  file_name: string;
  status: string;
  created_at: string;
  price: number;
};

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

const deliverables = [
  {
    title: "Wizualizacja Smokeview",
    desc: "Pliki .smv wraz z przekrojami (slice) i granicami — pełne odtworzenie rozwoju pożaru i dymu.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z M4 9h16 M9 4v16" />
    ),
  },
  {
    title: "Dane z urządzeń (DEVC)",
    desc: "CSV z pomiarami temperatury, widzialności i prędkości — gotowe do analizy warunków ewakuacji.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    title: "Pełny log obliczeń FDS",
    desc: "Kompletny przebieg symulacji z parametrami solvera — do weryfikacji i dokumentacji projektu.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
  {
    title: "Bezpieczny dostęp 60 dni",
    desc: "Wyniki pobierzesz przez podpisany link; po 60 dniach są automatycznie usuwane z serwera.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    ),
  },
];

const faqs = [
  {
    q: "Jakie pliki są obsługiwane?",
    a: "Pliki wejściowe FDS z rozszerzeniem .fds. Parser analizuje sekcje &MESH, &TIME, &REAC oraz elementy modelu (&OBST, &VENT, &DEVC) bezpośrednio w przeglądarce.",
  },
  {
    q: "Ile to kosztuje i kiedy płacę?",
    a: "Płacisz za faktyczny czas pracy CPU oraz storage wyników — bez abonamentu i opłat stałych. Wycenę widzisz przed uruchomieniem, a płatność (Stripe, BLIK, Przelewy24) następuje po zakończeniu obliczeń. Faktura VAT jest dostępna w panelu.",
  },
  {
    q: "Jak długo trwają obliczenia?",
    a: "Zależnie od liczby komórek i czasu symulacji. Szacunek czasu pokazujemy przy wycenie na podstawie warunku CFL i wydajności ~240 000 cell-timesteps/s na rdzeń. Każde zlecenie dostaje własny, dedykowany serwer AMD EPYC.",
  },
  {
    q: "Czy mogę uruchomić kilka symulacji naraz?",
    a: "Tak. Każde zlecenie uruchamia osobną maszynę wirtualną — nie ma kolejki ani współdzielenia zasobów między Twoimi symulacjami.",
  },
  {
    q: "Czy mój plik jest bezpieczny?",
    a: "Plik jest analizowany lokalnie w przeglądarce i przesyłany dopiero po zatwierdzeniu wyceny. Obliczenia biegną na serwerach w Unii Europejskiej (Hetzner), a maszyna jest kasowana po zakończeniu zlecenia.",
  },
];

function complexityColor(c: FdsEstimate["complexity"]) {
  return {
    mała: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    średnia: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    duża: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "bardzo duża": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }[c];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Oczekuje",    cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
    dispatched: { label: "W kolejce",   cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    running:    { label: "W trakcie",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    done:       { label: "Zakończone",  cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    error:      { label: "Błąd",        cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
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
  const [history, setHistory] = useState<Submission[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setForm((f) => ({
        ...f,
        name: f.name || profile?.full_name || "",
        email: f.email || user.email || "",
      }));

      const { data: subs } = await supabase
        .from("fds_submissions")
        .select("case_id, file_name, status, created_at, price")
        .order("created_at", { ascending: false })
        .limit(10);

      if (subs) setHistory(subs);
    }
    loadUser();
  }, []);

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
      body.append("name", form.name.trim() || form.email.split("@")[0] || "Użytkownik");
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
      router.push(`/symulacje/${data.caseId}`);
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

  const canSubmit = /\S+@\S+\.\S+/.test(form.email);

  return (
    <section className="relative z-10 bg-slate-50 dark:bg-[#0B1120] min-h-screen py-10">
      <div className="container max-w-3xl">

        {/* Hero */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary">CFD Cloud</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                Symulacje FDS w chmurze
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Wgraj plik wejściowy FDS — system dobierze serwer, oszacuje koszt i uruchomi obliczenia.
                Płacisz wyłącznie za faktyczne zużycie CPU i storage, bez abonamentu.
              </p>
            </div>
            {history.length > 0 && (
              <Link
                href="/symulacje/historia"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300 dark:hover:text-primary"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historia symulacji
              </Link>
            )}
          </div>

          {/* Trust / spec strip */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Dedykowany VM per zlecenie",
              "AMD EPYC · Hetzner (UE)",
              "Płatność od zużycia",
              "Wyniki przez 60 dni",
            ].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-[#1E232E] dark:text-slate-400"
              >
                <svg className="h-3 w-3 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-6">

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
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
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
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-6 space-y-5">
              <h2 className="text-xs font-medium text-slate-500 dark:text-slate-400">Wgraj plik FDS</h2>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-md border-2 border-dashed p-10 text-center transition-colors ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : file
                    ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                    : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                <input ref={inputRef} type="file" accept=".fds" className="hidden" onChange={onInputChange} />

                {file ? (
                  <div className="space-y-1">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mb-3">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Kliknij, aby wybrać inny plik</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 mb-3">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Przeciągnij plik lub kliknij, aby wybrać</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Obsługiwane formaty: .fds</p>
                  </div>
                )}
              </div>

              {parseError && (
                <div className="flex gap-3 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
                  <svg className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
                </div>
              )}

              <div className="flex gap-3 rounded-md border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-4">
                <svg className="h-5 w-5 shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">Co system analizuje?</p>
                  <p>Sekcje &amp;MESH (liczba i rozmiar siatek), &amp;TIME (czas symulacji), &amp;REAC (paliwo) oraz elementy modelu (&amp;OBST, &amp;VENT, &amp;DEVC).</p>
                  <p>Plik pozostaje lokalny — przesyłany jest dopiero po zatwierdzeniu wyceny.</p>
                </div>
              </div>

              <button
                onClick={analyze}
                disabled={!file || analyzing}
                className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* Historia zleceń */}
          {step === "upload" && history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">Poprzednie zlecenia</p>
              <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((s) => (
                    <Link
                      key={s.case_id}
                      href={`/symulacje/${s.case_id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">{s.case_id}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.file_name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {new Date(s.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={s.status} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {s.price.toLocaleString("pl-PL")} zł
                        </span>
                        <svg className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Onboarding: co otrzymasz + FAQ (tylko na kroku upload) */}
          {step === "upload" && (
            <div className="space-y-8 pt-2">
              {/* Co otrzymasz */}
              <div>
                <p className="mb-3 text-xs font-medium text-slate-400 dark:text-slate-500">Co otrzymasz</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {deliverables.map((d) => (
                    <div
                      key={d.title}
                      className="flex items-start gap-3.5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#1E232E]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{d.icon}</svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{d.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div>
                <p className="mb-3 text-xs font-medium text-slate-400 dark:text-slate-500">Najczęstsze pytania</p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-[#1E232E]">
                  {faqs.map((f) => (
                    <details key={f.q} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-slate-700 transition-colors hover:text-primary dark:text-slate-200 dark:hover:text-white [&::-webkit-details-marker]:hidden">
                        {f.q}
                        <svg className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <p className="px-4 pb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {(step === "review" || step === "submitting") && parseResult && estimate && (
            <div className="space-y-5">
              {/* Summary card */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Analiza pliku</h2>
                    <p className="font-bold text-slate-900 dark:text-white">{file?.name}</p>
                    {parseResult.chid && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">CHID: {parseResult.chid}</p>
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
                    <div key={item.label} className="rounded bg-slate-50 dark:bg-[#0B1120] p-4">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
                        {item.icon}
                        <span className="text-[11px] font-medium">{item.label}</span>
                      </div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{item.value}</p>
                      {item.sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{item.sub}</p>}
                    </div>
                  ))}
                </div>

                {parseResult.meshDetails.length > 1 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2">Szczegóły siatek</p>
                    <div className="flex flex-wrap gap-2">
                      {parseResult.meshDetails.map((m, i) => (
                        <span key={i} className="rounded bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                          #{i + 1} {m.ijk[0]}×{m.ijk[1]}×{m.ijk[2]} = {formatCells(m.cells)} komórek
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(parseResult.obstCount > 0 || parseResult.ventCount > 0 || parseResult.devcCount > 0) && (
                  <div className="mt-4 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {parseResult.obstCount > 0 && <span>Przeszkody (OBST): {parseResult.obstCount}</span>}
                    {parseResult.ventCount > 0 && <span>Otwory (VENT): {parseResult.ventCount}</span>}
                    {parseResult.devcCount > 0 && <span>Czujniki (DEVC): {parseResult.devcCount}</span>}
                  </div>
                )}
              </div>

              {/* Estimate card */}
              <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-6">
                <h2 className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-3">Szacunkowa wycena</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-medium text-amber-600/70 dark:text-amber-500 mb-1">Serwer obliczeniowy</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-200 uppercase">
                      {estimate.serverType}
                    </p>
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-500 mt-0.5">
                      {estimate.serverCores} dedykowane vCPU (AMD EPYC)
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-amber-600/70 dark:text-amber-500 mb-1">Szacowany czas obliczeń</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                      {formatHours(estimate.wallHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-amber-600/70 dark:text-amber-500 mb-1">Krok czasowy Δt</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                      {estimate.dtEstimate < 0.01
                        ? `${(estimate.dtEstimate * 1000).toFixed(1)} ms`
                        : `${estimate.dtEstimate.toFixed(3)} s`}
                    </p>
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-500 mt-0.5">
                      {estimate.cellDimSource === "file"
                        ? `z pliku (dx=${(parseResult.minCellDim! * 100).toFixed(1)} cm)`
                        : "założono dx = 10 cm"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-amber-600/70 dark:text-amber-500 mb-1">Koszt szacunkowy</p>
                    <p className="text-3xl font-bold text-amber-900 dark:text-amber-200">
                      ~{estimate.price.toLocaleString("pl-PL")} zł
                    </p>
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-500 mt-0.5">netto · płatność po obliczeniach</p>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-amber-600/70 dark:text-amber-500 border-t border-amber-200/60 dark:border-amber-800/40 pt-3">
                  To wstępny szacunek. Ostateczną cenę naliczamy po zakończeniu obliczeń — na podstawie
                  faktycznego zużycia serwera i przestrzeni na wyniki. Zapłacisz dopiero za gotowe rezultaty.
                </p>
              </div>

              {/* Form */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-6 space-y-4">
                <div>
                  <h2 className="text-xs font-medium text-slate-500 dark:text-slate-400">Wiadomość do zlecenia</h2>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Zlecenie powiążemy z Twoim kontem{form.email ? ` (${form.email})` : ""}. Ofertę i status obliczeń wyślemy na ten adres.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Wiadomość (opcjonalnie)
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Np. nazwa projektu, termin, dodatkowe wymagania…"
                    className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-[#0B1120] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {submitError && (
                  <div className="flex gap-3 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
                    <svg className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={submit}
                    disabled={!canSubmit || step === "submitting"}
                    className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                  >
                    Wróć
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="rounded-lg border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/20 p-8 text-center space-y-4">
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
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                Wyślij kolejne zlecenie
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
