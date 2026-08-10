"use client";

// ─── Wybór trybu obliczeń ────────────────────────────────────────────────────
//
// Trzy kafle (najtańszy / kompromis / najszybszy) i — pod nimi — pełna lista
// wariantów dla tych, którzy chcą sami zdecydować. Lista zawiera wyłącznie
// konfiguracje z frontu Pareto, więc każda pozycja jest w czymś najlepsza:
// nie ma wariantu, który byłby jednocześnie wolniejszy i droższy od innego.
//
// Zgodnie z zasadami copy FDSRun nie pokazujemy tu symboli maszyn dostawcy —
// klient widzi rdzenie, pamięć, czas i koszt szacunkowy.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { CHIP_SHAPE, TONE_CHIP } from "@/lib/tone";
import type { PlanTier, RunPlan } from "@/lib/fds/planner";

export interface ServerPickerProps {
  plans: RunPlan[];
  tiers: { eco: string | null; balanced: string | null; fast: string | null };
  selected: string | null;
  onSelect: (serverType: string) => void;
  loading?: boolean;
  meshCount: number;
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 10) return `${h.toFixed(1)} h`;
  return `${Math.round(h)} h`;
}

const TIER_ORDER: PlanTier[] = ["eco", "balanced", "fast"];

export default function ServerPicker({
  plans, tiers, selected, onSelect, loading = false, meshCount,
}: ServerPickerProps) {
  const t = useTranslations("symulacje.picker");
  const f = useFormat();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="rounded-panel border border-hairline bg-panel p-6">
        <div className="mb-4 h-3 w-40 rounded bg-panel-deep" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-tile bg-panel-deep" />
          ))}
        </div>
      </div>
    );
  }

  if (plans.length === 0) return null;

  const byType = new Map(plans.map((p) => [p.serverType, p]));
  // Warianty mogą się pokrywać (np. najtańszy bywa też kompromisem) — pokazujemy
  // każdą maszynę raz, z etykietą o najwyższym priorytecie.
  const tileTypes: Array<{ tier: PlanTier; plan: RunPlan }> = [];
  for (const tier of TIER_ORDER) {
    const type = tiers[tier];
    const plan = type ? byType.get(type) : null;
    if (plan && !tileTypes.some((x) => x.plan.serverType === plan.serverType)) {
      tileTypes.push({ tier, plan });
    }
  }

  const fastest = Math.min(...plans.map((p) => p.wallHours));
  const cheapest = Math.min(...plans.map((p) => p.price));

  return (
    <div className="rounded-panel border border-hairline bg-panel p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-fr-label uppercase text-muted">{t("heading")}</h2>
        {meshCount > 1 && (
          <span className="font-mono text-fr-sm text-faint">{t("meshes", { count: meshCount })}</span>
        )}
      </div>
      <p className="mb-5 text-fr-sm text-muted">{t("lead")}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        {tileTypes.map(({ tier, plan }) => {
          const active = selected === plan.serverType;
          return (
            <button
              key={plan.serverType}
              type="button"
              onClick={() => onSelect(plan.serverType)}
              aria-pressed={active}
              className={`rounded-tile border p-4 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/[0.06]"
                  : "border-hairline-soft bg-panel-deep hover:border-primary/40"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={`${CHIP_SHAPE} ${active ? TONE_CHIP.primary : TONE_CHIP.muted}`}>
                  {t(`tier.${tier}`)}
                </span>
                {plan.wallHours === fastest && tier !== "fast" && (
                  <span className="font-mono text-fr-micro uppercase text-signal">{t("alsoFastest")}</span>
                )}
              </div>

              <p className="fr-num font-heading text-fr-h3 text-ink">{formatHours(plan.wallHours)}</p>
              <p className="mt-0.5 font-mono text-fr-sm text-muted">
                {t("range", { lo: formatHours(plan.wallLoHours), hi: formatHours(plan.wallHiHours) })}
              </p>

              <p className="mt-3 fr-num font-heading text-fr-h3 text-primary">~{f.fmtPrice(plan.price)}</p>
              <p className="mt-1.5 border-t border-hairline pt-2 font-mono text-fr-sm text-muted">
                {t("hardware", { cores: plan.cores, ram: plan.ramGb })}
              </p>
              <p className="font-mono text-fr-sm text-faint">
                {plan.meshesPerProc > 1
                  ? t("meshesPerProc", { procs: plan.mpiProcs, meshes: plan.meshesPerProc })
                  : t("oneMeshPerProc", { procs: plan.mpiProcs })}
              </p>
            </button>
          );
        })}
      </div>

      {plans.length > tileTypes.length && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-fr-sm text-muted transition-colors hover:text-primary"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? t("hideAll") : t("showAll", { count: plans.length })}
          </button>

          {expanded && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-fr-sm">
                <thead>
                  <tr className="border-b border-hairline text-left font-mono text-fr-micro uppercase text-faint">
                    <th className="py-2 pr-3 font-normal">{t("col.mode")}</th>
                    <th className="py-2 pr-3 font-normal">{t("col.hardware")}</th>
                    <th className="py-2 pr-3 font-normal">{t("col.split")}</th>
                    <th className="py-2 pr-3 text-right font-normal">{t("col.time")}</th>
                    <th className="py-2 text-right font-normal">{t("col.cost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => {
                    const active = selected === plan.serverType;
                    return (
                      <tr
                        key={plan.serverType}
                        onClick={() => onSelect(plan.serverType)}
                        className={`cursor-pointer border-b border-hairline-soft transition-colors ${
                          active ? "bg-primary/[0.06]" : "hover:bg-panel-deep"
                        }`}
                      >
                        <td className="py-2.5 pr-3">
                          <span className="flex items-center gap-2">
                            <span
                              className={`inline-block h-3 w-3 shrink-0 rounded-full border ${
                                active ? "border-[5px] border-primary" : "border-hairline"
                              }`}
                            />
                            <span className="text-ink">
                              {plan.tier ? t(`tier.${plan.tier}`) : t("tier.custom")}
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-muted">
                          {t("hardware", { cores: plan.cores, ram: plan.ramGb })}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-muted">
                          {t("split", { procs: plan.mpiProcs, meshes: plan.meshesPerProc })}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className={`fr-num ${plan.wallHours === fastest ? "text-signal" : "text-ink"}`}>
                            {formatHours(plan.wallHours)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`fr-num ${plan.price === cheapest ? "text-signal" : "text-ink"}`}>
                            ~{f.fmtPrice(plan.price)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 font-mono text-fr-sm text-faint">{t("paretoNote")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
