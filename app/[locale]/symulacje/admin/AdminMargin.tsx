"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { summarizeMargin, type MarginRow } from "@/lib/fds/margin";
import { MARKUP_RANGE, TARGET_MARKUP } from "@/lib/fds/pricing";
import { TONE_DOT } from "@/lib/tone";
import {
  Chip, Kpi, Notice, SectionLabel, Skeleton, cardCls, tableCls, tdNumCls, thCls, theadRowCls, trCls,
} from "@/components/Cloud/ui";

/**
 * Realna marża — jedyne miejsce, w którym widać, ile z cennika faktycznie
 * zostaje. Panel rozdziela dwie liczby, które bardzo łatwo pomylić:
 *
 *   krotność cennikowa — przychód do kosztu zleceń zafakturowanych,
 *   krotność realna    — to samo, ale po doliczeniu maszyn spalonych na biegach
 *                        zakończonych błędem, za które nikt nie płaci.
 *
 * Pierwsza mówi, czy cennik jest ustawiony zgodnie z założeniem. Druga mówi,
 * ile zarabia firma. Rozjazd między nimi to koszt awaryjności.
 */

/** Pasek krotności na tle celu — ile z linii 4× udało się osiągnąć. */
function MultiplierBar({ value, target }: { value: number; target: number }) {
  // Skala do 1,5× celu, żeby przekroczenie też było widoczne, a nie „pełny pasek".
  const max = target * 1.5;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const targetPct = (target / max) * 100;
  const tone = value >= target ? "ok" : value >= target * 0.75 ? "warn" : "primary";

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-panel-deep">
      <div
        className={`h-full rounded-full transition-all duration-700 ${TONE_DOT[tone]}`}
        style={{ width: `${pct}%` }}
      />
      {/* Linia celu — bez niej liczba nie mówi, czy jest dobrze */}
      <div
        className="absolute inset-y-0 w-px bg-ink/60"
        style={{ left: `${targetPct}%` }}
        aria-hidden
      />
    </div>
  );
}

export default function AdminMargin() {
  const t = useTranslations("admin.margin");
  const f = useFormat();
  const [rows, setRows] = useState<MarginRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.data)) setRows(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const s = useMemo(() => summarizeMargin(rows), [rows]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  if (s.billedJobs === 0 && s.burnedJobs === 0) {
    return <p className="py-10 text-center text-fr-sm text-muted">{t("noData")}</p>;
  }

  const onTarget = s.realizedMultiplier >= TARGET_MARKUP;
  const fmtX = (v: number) => `${v.toFixed(2)}×`;

  return (
    <div className="space-y-8">

      {/* Wynik wobec celu — pierwsza rzecz, którą trzeba zobaczyć */}
      <Notice
        tone={onTarget ? "ok" : "warn"}
        title={t("verdictTitle")}
        actions={
          <Chip tone={onTarget ? "ok" : "warn"} dot>
            {t("target", { x: TARGET_MARKUP.toFixed(1) })}
          </Chip>
        }
      >
        <p>
          {t(onTarget ? "verdictOk" : "verdictBelow", {
            realized: fmtX(s.realizedMultiplier),
            billed: fmtX(s.multiplier),
            burn: f.fmtPrice(s.costBurned, { decimals: true }),
            share: Math.round(s.burnShare * 100),
          })}
        </p>
      </Notice>

      {/* Rachunek */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={t("revenue")} value={f.fmtPrice(s.revenue)} tone="primary" />
        <Kpi label={t("costBilled")} value={f.fmtPrice(s.costBilled, { decimals: true })} />
        <Kpi
          label={t("costBurned")}
          value={f.fmtPrice(s.costBurned, { decimals: true })}
          tone={s.costBurned > 0 ? "warn" : "ink"}
          sub={t("burnedJobs", { n: s.burnedJobs })}
        />
        <Kpi label={t("grossMargin")} value={f.fmtPrice(s.margin)} tone="ok" />
        <Kpi label={t("multiplier")} value={fmtX(s.multiplier)} sub={t("multiplierSub")} />
        <Kpi
          label={t("realized")}
          value={fmtX(s.realizedMultiplier)}
          tone={onTarget ? "ok" : "warn"}
          sub={t("realizedSub")}
        />
      </div>

      {/* Progresja marży wg wielkości modelu */}
      <div>
        <SectionLabel className="mb-1 block">{t("bySizeTitle")}</SectionLabel>
        <p className="mb-3 text-fr-sm text-muted">
          {t("bySizeLead", { max: MARKUP_RANGE.max.toFixed(1), min: MARKUP_RANGE.min.toFixed(1) })}
        </p>

        <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
          <table className={`${tableCls} min-w-[680px]`}>
            <thead>
              <tr className={theadRowCls}>
                {[t("colSize"), t("colJobs"), t("colRevenue"), t("colCost"), t("colMargin"), t("colMultiplier")].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft">
              {s.buckets.map((b) => (
                <tr key={b.key} className={trCls}>
                  <td className="px-3 py-2.5 text-ink">{t(`size.${b.key}`)}</td>
                  <td className={tdNumCls}>{b.jobs}</td>
                  <td className={`${tdNumCls} text-ink`}>{f.fmtPrice(b.revenue)}</td>
                  <td className={tdNumCls}>{f.fmtPrice(b.cost, { decimals: true })}</td>
                  <td className={`${tdNumCls} text-ok`}>{f.fmtPrice(b.margin)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="fr-num w-14 shrink-0 font-mono text-fr-sm text-ink">{fmtX(b.multiplier)}</span>
                      <div className="min-w-[80px] flex-1">
                        <MultiplierBar value={b.multiplier} target={TARGET_MARKUP} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 font-mono text-fr-micro uppercase text-faint">{t("targetLine")}</p>
      </div>

      {/* Skąd biorą się liczby — panel finansowy musi być audytowalny */}
      <div className="rounded-card border border-hairline bg-panel-deep p-4">
        <SectionLabel className="mb-3 block">{t("methodTitle")}</SectionLabel>
        <ul className="space-y-1.5 text-fr-sm text-muted">
          <li>{t("method1")}</li>
          <li>{t("method2")}</li>
          <li>{t("method3")}</li>
        </ul>
      </div>
    </div>
  );
}
