"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { Link, useRouter } from "@/i18n/navigation";
import { parseFds, estimateCost, toPlanInput, FdsParseResult, FdsEstimate } from "@/lib/fds/parser";
import type { RunPlan } from "@/lib/fds/planner";
import { createClient } from "@/lib/supabase/client";
import CloudMarketing from "@/components/Cloud/CloudMarketing";
import ServerPicker from "@/components/Cloud/ServerPicker";
import { CHIP_SHAPE, TONE_CHIP } from "@/lib/tone";

type PlanResponse = {
  plans: RunPlan[];
  tiers: { eco: string | null; balanced: string | null; fast: string | null };
  dtEstimate: number;
  cellDimSource: "file" | "assumed";
  blocked: string | null;
};

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
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return String(n);
}

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

// Skala złożoności w palecie serwisu: chłodny „signal" dla lekkich modeli,
// przez neutralny, po ostrzegawczy i markowy przy najcięższych.
function complexityColor(c: FdsEstimate["complexity"]) {
  return {
    mała: TONE_CHIP.signal,
    średnia: TONE_CHIP.muted,
    duża: TONE_CHIP.warn,
    "bardzo duża": TONE_CHIP.primary,
  }[c];
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("symulacje.status");
  const cls: Record<string, string> = {
    pending:    TONE_CHIP.muted,
    dispatched: TONE_CHIP.ink,
    running:    TONE_CHIP.warn,
    done:       TONE_CHIP.signal,
    error:      TONE_CHIP.primary,
  };
  const label: Record<string, string> = {
    pending: t("oczekuje"), dispatched: t("wKolejce"), running: t("wTrakcie"),
    done: t("zakonczone"), error: t("blad"),
  };
  return (
    <span className={`${CHIP_SHAPE} ${cls[status] ?? TONE_CHIP.muted}`}>
      {label[status] ?? status}
    </span>
  );
}

export default function SymulacjePage() {
  const t = useTranslations("symulacje");
  const f = useFormat();
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<FdsParseResult | null>(null);
  const [estimate, setEstimate] = useState<FdsEstimate | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // Warianty sprzętowe dobiera serwer (zna dostępność maszyn i kalibrację
  // z historii). Do czasu odpowiedzi kreator pokazuje wycenę policzoną lokalnie.
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [serverType, setServerType] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [caseId, setCaseId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<Submission[]>([]);
  // Dostęp do uruchamiania symulacji jest tymczasowo ograniczony (do czasu płatności).
  // null = jeszcze sprawdzamy, false = obcy → panel „dostęp ograniczony", true = admin.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAllowed(false); return; }

      const isAllowed = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      setAllowed(isAllowed);
      if (!isAllowed) return; // obcy nie ładuje danych kreatora

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
      setParseError(t("upload.onlyFds"));
      return;
    }
    setFile(f);
    setParseError(null);
  }, [t]);

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

  // Warianty sprzętowe z serwera. Gdy zapytanie padnie, zostaje wycena lokalna —
  // kreator ma działać także wtedy, gdy dostawca chwilowo nie odpowiada.
  const loadPlans = useCallback(async (result: FdsParseResult) => {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/symulacje/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPlanInput(result)),
      });
      if (!res.ok) return;
      const data: PlanResponse = await res.json();
      setPlan(data);
      setServerType(data.tiers.balanced ?? data.plans[0]?.serverType ?? null);
    } catch {
      /* zostaje wycena policzona lokalnie */
    } finally {
      setPlanLoading(false);
    }
  }, []);

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
        void loadPlans(result);
      } else {
        // Parser zwraca KOD błędu (działa też serwerowo, bez kontekstu i18n) —
        // tekst dobieramy tutaj, w języku strony.
        setParseError(result.error ? t(`parseErrors.${result.error}`) : t("upload.readError"));
      }
      setAnalyzing(false);
    };
    reader.onerror = () => {
      setParseError(t("upload.readError"));
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
      body.append("name", form.name.trim() || form.email.split("@")[0] || t("form.fallbackName"));
    // Język zlecenia — serwer zapisze go przy rekordzie i wyśle w nim maile.
    body.append("locale", f.locale);
      body.append("email", form.email.trim());
      body.append("notes", form.notes.trim());
      body.append("parsed", JSON.stringify(parseResult));
      body.append("estimate", JSON.stringify(estimate));
      // Wskazówka, nie wiążąca decyzja — serwer i tak przelicza plan od zera.
      if (serverType) body.append("serverType", serverType);

      const res = await fetch("/api/symulacje/submit", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? t("form.genericError"));
        setStep("review");
        return;
      }

      setCaseId(data.caseId);
      setStep("done");
      router.push(`/symulacje/${data.caseId}`);
    } catch {
      setSubmitError(t("form.networkError"));
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
    setPlan(null);
    setPlanLoading(false);
    setServerType(null);
    setForm({ name: "", email: "", notes: "" });
  };

  // Wariant zaznaczony przez klienta; zanim serwer odpowie — wycena lokalna.
  const activePlan = plan?.plans.find((p) => p.serverType === serverType) ?? null;

  const canSubmit = /\S+@\S+\.\S+/.test(form.email);

  // Sprawdzamy uprawnienia — nie pokazujemy kreatora, zanim nie wiemy, kto to.
  if (allowed === null) {
    return (
      <section className="relative z-10 min-h-screen bg-canvas px-4 pb-24 pt-14">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="h-40 rounded-card bg-panel-deep animate-pulse" />
        </div>
      </section>
    );
  }

  // Estymator jest publiczny — parsowanie i wycena dzieją się w przeglądarce
  // (zero kosztu serwera), więc każdy może wgrać plik i poznać koszt. Bramka
  // dostępu jest dopiero na przycisku „Uruchom" w kroku wyceny (patrz niżej).
  return (
    <section className="relative z-10 min-h-screen bg-canvas px-4 pb-24 pt-14">
      <div className="mx-auto w-full max-w-[1100px]">

        {/* Hero — ten sam układ co na stronie głównej: kicker w mono, nagłówek
            Manrope, lead, a pod spodem pasek twardych parametrów oddzielony
            cienką kreską. Świadomie BEZ okrągłej „pigułki" z badge'em — landing
            takich nie ma, a to ona najbardziej odstawała od reszty. */}
        <div className="mb-14">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <span className="mb-3 block font-mono text-fr-label uppercase text-muted">
                FDSRUN // NOWE ZLECENIE
              </span>
              <h1 className="max-w-[720px] fr-balance font-heading text-fr-h1 text-ink">
                {t("title")}
              </h1>
              <p className="mt-5 max-w-2xl text-fr-lead text-muted">
                {t("lead")}
              </p>
            </div>
            {history.length > 0 && (
              <Link
                href="/symulacje/historia"
                className="inline-flex shrink-0 items-center gap-2 rounded-panel border border-hairline px-4 py-2.5 text-fr-body font-semibold text-muted transition-colors hover:border-primary/40 hover:text-primary"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t("historyLink")}
              </Link>
            )}
          </div>

          {/* Pasek specyfikacji — 1:1 jak pod konsolą na stronie głównej */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-hairline pt-6">
            {[t("trust.vm"), t("trust.epyc"), t("trust.payg"), t("trust.retention")].map((tag) => (
              <span key={tag} className="flex items-center gap-2.5 font-mono text-fr-sm text-ink">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-8">

          {/* Wskaźnik kroków w języku pasa etapów ze strony głównej: węzeł na
              osi (romb dla aktywnego), etykieta meta w mono nad nazwą kroku.
              Zamiast okrągłych pigułek z zieloną „zrobione", która wprowadzała
              kolor spoza palety serwisu. */}
          <div className="grid grid-cols-3 gap-4 border-b border-hairline pb-8 sm:gap-8">
            {(["upload", "review", "done"] as const).map((s, i) => {
              const labels = [t("steps.file"), t("steps.estimate"), t("steps.confirm")];
              const active = s === step || (s === "review" && step === "submitting");
              const done =
                (s === "upload" && (step === "review" || step === "submitting" || step === "done")) ||
                (s === "review" && step === "done");
              return (
                <div key={s} className="flex flex-col items-start">
                  <div className="relative mb-4 flex h-8 w-full items-center">
                    {active ? (
                      <span className="absolute left-0 z-10 h-3 w-3 rotate-45 border border-primary bg-primary/20 shadow-[0_0_15px_rgb(var(--fr-signal)/0.35)]" />
                    ) : done ? (
                      <span className="absolute left-0 z-10 h-3 w-3 rotate-45 border border-signal bg-signal/30" />
                    ) : (
                      <span className="absolute left-[2px] z-10 h-2 w-2 border border-hairline bg-canvas" />
                    )}
                    <span
                      className={`ml-5 h-px w-full ${
                        active ? "bg-primary/25" : done ? "bg-signal/25" : "bg-hairline-soft"
                      }`}
                    />
                  </div>
                  <span
                    className={`mb-1 font-mono text-fr-label uppercase ${
                      active ? "text-primary" : done ? "text-signal" : "text-muted"
                    }`}
                  >
                    {done ? t("steps.stateDone") : active ? t("steps.stateActive") : `0${i + 1}`}
                  </span>
                  <span className={`font-heading text-fr-h4 ${active || done ? "text-ink" : "text-muted"}`}>
                    {labels[i]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="relative overflow-hidden rounded-card border border-hairline bg-panel p-6 md:p-8">
              {/* Znaczniki narożników — ten sam detal co w ramce analitycznej
                  i na kartach logowania */}
              <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t border-hairline" />
              <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 border-r border-t border-hairline" />
              <span className="pointer-events-none absolute bottom-3 left-3 h-2 w-2 border-b border-l border-hairline" />
              <span className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 border-b border-r border-hairline" />

              <div className="relative space-y-6">
              <h2 className="font-mono text-fr-label uppercase text-muted">{t("upload.heading")}</h2>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`fr-dots relative cursor-pointer rounded-panel border border-dashed p-12 text-center transition-colors ${
                  dragging
                    ? "border-primary bg-primary/[0.06]"
                    : file
                    ? "border-signal bg-signal/[0.06]"
                    : "border-hairline hover:border-primary/40"
                }`}
              >
                <input ref={inputRef} type="file" accept=".fds" className="hidden" onChange={onInputChange} />

                {file ? (
                  <div className="space-y-1">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-tile border border-signal/30 bg-signal/10 text-signal">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-mono text-fr-body font-bold text-ink">{file.name}</p>
                    <p className="fr-num font-mono text-fr-sm text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    <p className="mt-2 text-fr-sm text-muted">{t("upload.pickAnother")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-tile border border-hairline bg-panel-deep text-muted">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="font-heading text-fr-h4 text-ink">{t("upload.drop")}</p>
                    <p className="font-mono text-fr-sm text-muted">{t("upload.formats")}</p>
                  </div>
                )}
              </div>

              {parseError && (
                <div role="alert" className="flex gap-3 rounded-panel border border-primary/40 bg-primary/[0.07] p-4">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-fr-sm text-ink">{parseError}</p>
                </div>
              )}

              {/* Nota o analizie lokalnej — na tokenach „signal" zamiast błękitu
                  Tailwinda, którego paleta serwisu nie zna. */}
              <div className="flex gap-3 rounded-panel border border-signal/25 bg-signal/[0.06] p-4">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-signal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="space-y-1 text-fr-sm text-muted">
                  <p className="font-semibold text-ink">{t("upload.infoTitle")}</p>
                  <p>{t("upload.infoBody")}</p>
                  <p>{t("upload.infoLocal")}</p>
                </div>
              </div>

              <button
                onClick={analyze}
                disabled={!file || analyzing}
                className="flex items-center gap-2 rounded-panel bg-primary px-7 py-3.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {analyzing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("upload.analyzing")}
                  </>
                ) : (
                  <>
                    {t("upload.analyze")}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
              </div>
            </div>
          )}

          {/* Historia zleceń */}
          {step === "upload" && history.length > 0 && (
            <div>
              <p className="mb-4 font-mono text-fr-label uppercase text-muted">{t("upload.previousOrders")}</p>
              <div className="overflow-hidden rounded-card border border-hairline">
                <div className="divide-y divide-hairline-soft">
                  {history.map((s) => (
                    <Link
                      key={s.case_id}
                      href={`/symulacje/${s.case_id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 bg-panel hover:bg-panel-deep transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-fr-sm font-mono font-semibold text-muted">{s.case_id}</p>
                        <p className="text-fr-body font-medium text-ink truncate">{s.file_name}</p>
                        <p className="text-fr-sm text-muted mt-0.5">
                          {f.fmtDate(s.created_at, { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={s.status} />
                        <span className="font-mono text-fr-micro uppercase text-faint">
                          {f.fmtPrice(s.price)}
                        </span>
                        <svg className="h-4 w-4 text-faint group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="pt-2">
              <CloudMarketing />
            </div>
          )}

          {/* Step 2: Review */}
          {(step === "review" || step === "submitting") && parseResult && estimate && (
            <div className="space-y-5">
              {/* Summary card */}
              <div className="rounded-panel border border-hairline bg-panel p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="font-mono text-fr-micro uppercase text-faint mb-1.5">{t("review.analysis")}</h2>
                    <p className="font-bold text-ink">{file?.name}</p>
                    {parseResult.chid && (
                      <p className="text-fr-sm text-muted mt-0.5">CHID: {parseResult.chid}</p>
                    )}
                  </div>
                  <span className={`${CHIP_SHAPE} ${complexityColor(estimate.complexity)}`}>
                    {t("review.complexity", { level: t(`complexityLevels.${estimate.complexity}`) })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: t("review.cores"),
                      value: String(parseResult.totalCores),
                      sub: parseResult.ompThreads > 1
                        ? t("review.coresMix", { mpi: parseResult.meshCount, omp: parseResult.ompThreads })
                        : t("review.meshesMpi", { count: parseResult.meshCount }),
                    },
                    {
                      label: t("review.cellsTotal"),
                      value: formatCells(parseResult.totalCells),
                      sub: undefined as string | undefined,
                    },
                    {
                      label: t("review.simTime"),
                      value: `${parseResult.tEnd} s`,
                      sub: undefined as string | undefined,
                    },
                    {
                      label: t("review.fuel"),
                      value: parseResult.fuel ?? "—",
                      sub: undefined as string | undefined,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-tile border border-hairline-soft bg-panel-deep p-4">
                      <p className="mb-2 font-mono text-fr-micro uppercase text-muted">{item.label}</p>
                      <p className="fr-num font-heading text-fr-h3 text-ink">{item.value}</p>
                      {item.sub && <p className="text-fr-sm text-muted mt-0.5">{item.sub}</p>}
                    </div>
                  ))}
                </div>

                {parseResult.meshDetails.length > 1 && (
                  <div className="mt-4">
                    <p className="mb-2 font-mono text-fr-micro uppercase text-muted">{t("review.meshDetails")}</p>
                    <div className="flex flex-wrap gap-2">
                      {parseResult.meshDetails.map((m, i) => (
                        <span key={i} className="rounded-chip border border-hairline-soft bg-panel-deep px-2.5 py-1 font-mono text-fr-sm text-muted">
                          #{i + 1} {m.ijk[0]}×{m.ijk[1]}×{m.ijk[2]} = {formatCells(m.cells)} {t("review.cellsWord")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(parseResult.obstCount > 0 || parseResult.ventCount > 0 || parseResult.devcCount > 0) && (
                  <div className="mt-4 flex gap-3 text-fr-sm text-muted">
                    {parseResult.obstCount > 0 && <span>{t("review.obst", { n: parseResult.obstCount })}</span>}
                    {parseResult.ventCount > 0 && <span>{t("review.vent", { n: parseResult.ventCount })}</span>}
                    {parseResult.devcCount > 0 && <span>{t("review.devc", { n: parseResult.devcCount })}</span>}
                  </div>
                )}
              </div>

              {/* Tryb obliczeń — wybór między krótszym czasem a niższym kosztem.
                  Warianty liczy serwer, bo tylko on zna aktualną dostępność
                  maszyn i kalibrację z zakończonych zleceń. */}
              {(planLoading || (plan?.plans.length ?? 0) > 0) && (
                <ServerPicker
                  plans={plan?.plans ?? []}
                  tiers={plan?.tiers ?? { eco: null, balanced: null, fast: null }}
                  selected={serverType}
                  onSelect={setServerType}
                  loading={planLoading}
                  meshCount={parseResult.meshCount}
                />
              )}

              {/* Wycena — kluczowy odczyt kreatora, więc dostaje traktowanie
                  ramki analitycznej ze strony głównej: ciemniejszy panel z
                  teksturą, etykiety w mono, liczby w Manrope, kwota w kolorze
                  marki. Wcześniej cała karta była bursztynowa — kolor, którego
                  paleta serwisu używa wyłącznie do ostrzeżeń. */}
              <div className="relative overflow-hidden rounded-card border border-hairline bg-panel-deep p-6 md:p-8">
                <div className="fr-dots pointer-events-none absolute inset-0 opacity-40" />
                <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t border-hairline" />
                <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 border-r border-t border-hairline" />
                <span className="pointer-events-none absolute bottom-3 left-3 h-2 w-2 border-b border-l border-hairline" />
                <span className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 border-b border-r border-hairline" />

                <div className="relative">
                  <h2 className="mb-6 font-mono text-fr-label uppercase text-muted">{t("estimate.heading")}</h2>

                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    <div>
                      <p className="mb-1.5 font-mono text-fr-label uppercase text-muted">{t("estimate.server")}</p>
                      <p className="fr-num font-heading text-fr-h3 text-ink">
                        {t("estimate.coresValue", { cores: activePlan?.cores ?? estimate.serverCores })}
                      </p>
                      <p className="mt-1 font-mono text-fr-sm text-muted">
                        {activePlan
                          ? t("estimate.serverSub", {
                              procs: activePlan.mpiProcs,
                              ram: activePlan.ramGb,
                            })
                          : t("estimate.serverSubPending")}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1.5 font-mono text-fr-label uppercase text-muted">{t("estimate.estTime")}</p>
                      <p className="fr-num font-heading text-fr-h3 text-ink">
                        {formatHours(activePlan?.wallHours ?? estimate.wallHours)}
                      </p>
                      {activePlan && (
                        <p className="mt-1 font-mono text-fr-sm text-muted">
                          {t("estimate.timeRange", {
                            lo: formatHours(activePlan.wallLoHours),
                            hi: formatHours(activePlan.wallHiHours),
                          })}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1.5 font-mono text-fr-label uppercase text-muted">{t("estimate.dt")}</p>
                      <p className="fr-num font-heading text-fr-h3 text-signal">
                        {estimate.dtEstimate < 0.01
                          ? `${(estimate.dtEstimate * 1000).toFixed(1)} ms`
                          : `${estimate.dtEstimate.toFixed(3)} s`}
                      </p>
                      <p className="mt-1 font-mono text-fr-sm text-muted">
                        {estimate.cellDimSource === "file"
                          ? t("estimate.dtFromFile", { dx: (parseResult.minCellDim! * 100).toFixed(1) })
                          : t("estimate.dtAssumed")}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1.5 font-mono text-fr-label uppercase text-muted">{t("estimate.costLabel")}</p>
                      <p className="fr-num font-heading text-fr-h2 text-primary">
                        ~{f.fmtPrice(activePlan?.price ?? estimate.price)}
                      </p>
                      <p className="mt-1 font-mono text-fr-sm text-muted">{t("estimate.costSub")}</p>
                    </div>
                  </div>

                  <p className="mt-6 border-t border-hairline pt-4 font-mono text-fr-sm text-muted">
                    {t("estimate.note")}
                  </p>
                </div>
              </div>

              {/* Zamówienie — tylko dla użytkowników z dostępem do uruchamiania.
                  Estymator jest publiczny, więc reszta zna już koszt i widzi CTA „poproś o dostęp". */}
              {allowed ? (
              <div className="rounded-panel border border-hairline bg-panel p-6 space-y-4">
                <div>
                  <h2 className="text-fr-sm font-medium text-muted">{t("form.heading")}</h2>
                  <p className="mt-1 text-fr-sm text-muted">
                    {t("form.linkedInfo", { email: form.email ? ` (${form.email})` : "" })}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-fr-sm font-bold text-muted">
                    {t("form.messageLabel")}
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder={t("form.messagePlaceholder")}
                    className="w-full rounded-panel border border-hairline bg-canvas px-4 py-2.5 text-fr-body text-ink placeholder-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {submitError && (
                  <div role="alert" className="flex gap-3 rounded-panel border border-primary/40 bg-primary/[0.07] p-4">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-fr-sm text-ink">{submitError}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={submit}
                    disabled={!canSubmit || step === "submitting"}
                    className="flex items-center gap-2 rounded-panel bg-primary px-5 py-2.5 text-fr-body font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {step === "submitting" ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t("form.submitting")}
                      </>
                    ) : (
                      <>
                        {t("form.submit")}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                  <button
                    onClick={reset}
                    disabled={step === "submitting"}
                    className="rounded-panel border border-hairline px-4 py-2.5 text-fr-body font-semibold text-muted hover:bg-panel-deep transition-colors disabled:opacity-40"
                  >
                    {t("form.back")}
                  </button>
                </div>
              </div>
              ) : (
                <div className="rounded-panel border border-primary/25 bg-primary/[0.06] p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-primary/10 text-primary">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-fr-body font-bold text-ink">{t("restricted.title")}</p>
                      <p className="mt-1 text-fr-body leading-relaxed text-muted">{t("restricted.lead")}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <a
                          href="mailto:biuro@fp-solutions.pl"
                          className="inline-flex items-center gap-2 rounded-panel bg-primary px-5 py-2.5 text-fr-body font-bold text-white transition-colors hover:bg-primary/90"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {t("restricted.emailCta")}
                        </a>
                        <a
                          href="tel:+48790782993"
                          className="inline-flex items-center gap-2 rounded-panel border border-hairline px-5 py-2.5 text-fr-body font-semibold text-ink transition-colors hover:bg-panel-deep"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          +48 790 782 993
                        </a>
                        <button
                          onClick={reset}
                          className="text-fr-body font-medium text-muted transition-colors hover:text-primary"
                        >
                          {t("form.back")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="relative overflow-hidden rounded-card border border-hairline bg-panel p-8 text-center md:p-12">
              <div className="fr-dots pointer-events-none absolute inset-0 opacity-40" />
              <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t border-hairline" />
              <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 border-r border-t border-hairline" />
              <span className="pointer-events-none absolute bottom-3 left-3 h-2 w-2 border-b border-l border-hairline" />
              <span className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 border-b border-r border-hairline" />

              <div className="relative space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-tile border border-signal/30 bg-signal/10 text-signal">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-heading text-fr-h2 text-ink">{t("done.title")}</h2>
                  <p className="mt-2 font-mono text-fr-body text-muted">
                    {t("done.caseNo")} <span className="font-bold text-ink">{caseId}</span>
                  </p>
                </div>
                <p className="mx-auto max-w-md text-fr-body text-muted">
                  {t("done.body", { email: form.email })}
                </p>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-panel border border-hairline px-6 py-3 text-fr-body font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {t("done.again")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
