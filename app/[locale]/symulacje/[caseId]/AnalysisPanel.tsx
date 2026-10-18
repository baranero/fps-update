"use client";

// „Analiza do raportu” — liczby z wyników DEVC/HRR, które projektant przepisuje
// do opracowania. Bez werdyktu (patrz lib/fds/analysis.ts): próg i chwila
// aktywacji są parametrami, ocenę formułuje projektant.

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Btn, inputSmCls, tableCls, tdCls, tdNumCls, thCls, theadRowCls } from "@/components/Cloud/ui";
import { parseFdsCsv } from "@/lib/fds/devc";
import type { FdsDevc } from "@/lib/fds/parser";
import {
  analyze, DEFAULT_PARAMS, FLOW_UNCERTAINTY, realTransmission, type AnalysisParams,
} from "@/lib/fds/analysis";

export default function AnalysisPanel({
  caseId, devcCsv, hrrCsv, setpoints, fullData, running,
}: {
  caseId: string;
  devcCsv: string | null;
  hrrCsv: string | null;
  setpoints: FdsDevc[] | null;
  /** true = pełny plik z magazynu; false = próbkowany strumień podglądu. */
  fullData: boolean;
  running: boolean;
}) {
  const t = useTranslations("symDetail.analysis");
  const locale = useLocale();
  const nl = locale === "en" ? "en-GB" : "pl-PL";
  const n = (v: number | null | undefined, d = 1) =>
    v == null || !Number.isFinite(v) ? "—" : v.toLocaleString(nl, { maximumFractionDigits: d, minimumFractionDigits: d });
  const s = (v: number | null | undefined) => (v == null ? "—" : `${n(v, 0)} s`);

  const devc = useMemo(() => parseFdsCsv(devcCsv), [devcCsv]);
  const hrr = useMemo(() => parseFdsCsv(hrrCsv), [hrrCsv]);

  const [params, setParams] = useState<AnalysisParams>(DEFAULT_PARAMS);
  const storeKey = `fdsrun:analysis:${caseId}`;

  // Tory transmitancji (bez wyboru punktu — ten dochodzi niżej).
  const base = useMemo(() => analyze(devc, hrr, setpoints, params), [devc, hrr, setpoints, params]);

  // Domyślny punkt pomiarowy: tory zadymione JUŻ PRZED uruchomieniem systemu —
  // to jest przestrzeń nad źródłem, którą wytyczne każą oceniać (p. 7.3.6).
  // Tor na parterze, zadymiony dopiero przez odwrócony ciąg, do niego nie wchodzi.
  const defaultIds = useMemo(
    () => base.transmission.filter((r) => r.below.some((b) => b.from < params.activation)).map((r) => r.id),
    [base.transmission, params.activation]
  );
  const [picked, setPicked] = useState<string[] | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.ids)) setPicked(saved.ids);
        if (saved.params) setParams({ ...DEFAULT_PARAMS, ...saved.params });
      }
    } catch { /* brak pamięci przeglądarki — zostają wartości domyślne */ }
  }, [storeKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify({ ids: picked, params }));
    } catch { /* j.w. */ }
  }, [storeKey, picked, params]);

  const ids = picked ?? defaultIds;
  const a = useMemo(() => analyze(devc, hrr, setpoints, params, ids), [devc, hrr, setpoints, params, ids]);
  const [copied, setCopied] = useState(false);

  if (!devc && !hrr) {
    return <p className="text-fr-sm text-muted">{running ? t("emptyRunning") : t("empty")}</p>;
  }

  const toggle = (id: string) =>
    setPicked((cur) => {
      const list = cur ?? defaultIds;
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });

  const reachLabel = (r: number | null | "never_below") =>
    r === "never_below" ? t("neverBelow") : r == null ? t("notReached") : s(r);

  const periods = (b: { from: number; to: number | null }[]) =>
    b.length ? b.map((p) => `${n(p.from, 0)}–${p.to == null ? t("toEnd") : n(p.to, 0)} s`).join(", ") : t("none");

  const setNum = (k: keyof AnalysisParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value.replace(",", "."));
    if (Number.isFinite(v)) setParams((p) => ({ ...p, [k]: v }));
  };

  // ── Eksport: tabela HTML do schowka (Word wkleja ją jako tabelę) + CSV ────
  const rowsTracks = a.transmission.map((r) => [
    r.id,
    r.min ? `${n(r.min.value)} %/m @ ${n(r.min.t, 0)} s` : "—",
    periods(r.below),
    reachLabel(r.reach),
    r.reachStable == null ? "—" : s(r.reachStable),
  ]);
  const headTracks = [t("colTrack"), t("colMin"), t("colBelow"), t("colReach"), t("colStable")];
  const rowsUnc = a.uncertainty.map((u) => [
    t(`unc.${u.key}`), `${n(u.modelThreshold)} %/m`, `${n(u.confidence * 100, 1)} %`, s(u.reach), s(u.tOdd),
  ]);
  const headUnc = [t("colLevel"), t("colModelThr"), t("colConfidence"), t("colReach"), t("colTodd")];

  const htmlTable = (head: string[], rows: string[][]) =>
    `<table border="1" cellpadding="4" style="border-collapse:collapse"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("")}</table>`;

  const copyTables = async () => {
    const html = [
      `<p><b>${t("pointTitle")}</b>: ${t("pointReach")} ${s(a.point.reach)}; t<sub>odd</sub> = ${s(a.point.tOdd)} (${t("paramsLine", { act: n(params.activation, 0), thr: n(params.threshold, 0) })})</p>`,
      htmlTable(headTracks, rowsTracks),
      a.uncertainty.length ? `<p><b>${t("uncTitle")}</b></p>${htmlTable(headUnc, rowsUnc)}` : "",
    ].join("");
    const text = [headTracks, ...rowsTracks].map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadCsv = () => {
    const esc = (c: string) => `"${c.replace(/"/g, '""')}"`;
    const lines = [headTracks, ...rowsTracks, [], headUnc, ...rowsUnc].map((r) => r.map(esc).join(";"));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `${caseId}_analiza.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  const last = a.transmission.filter((r) => a.point.ids.includes(r.id) && r.last);

  return (
    <div className="space-y-6">
      {!fullData && (
        <p className="rounded-panel border border-warn/30 bg-warn/[0.07] px-4 py-3 text-fr-sm text-warn">
          {t("sampledNote")}
        </p>
      )}

      {/* Parametry */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["activation", t("pActivation"), "s"],
          ["threshold", t("pThreshold"), "%/m"],
          ["delta", t("pDelta"), "δ"],
          ["sigma", t("pSigma"), "σ̃"],
        ] as const).map(([k, label, unit]) => (
          <label key={k} className="block">
            <span className="mb-1 block font-mono text-fr-micro uppercase text-faint">{label}</span>
            <span className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                defaultValue={String(params[k]).replace(".", locale === "en" ? "." : ",")}
                key={`${k}-${params[k]}`}
                onBlur={setNum(k)}
                className={`${inputSmCls} w-full`}
              />
              <span className="font-mono text-fr-sm text-muted">{unit}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-fr-sm text-faint">{t("paramsHint")}</p>

      {/* Punkt pomiarowy */}
      {a.transmission.length > 0 ? (
        <div className="rounded-card border border-hairline bg-panel p-5">
          <p className="font-mono text-fr-micro uppercase text-faint">{t("pointTitle")}</p>
          <div className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <p className="text-fr-sm text-muted">{t("pointReach")}</p>
              <p className="fr-num font-heading text-fr-h3 text-ink">{a.point.ids.length ? s(a.point.reach) : "—"}</p>
            </div>
            <div>
              <p className="text-fr-sm text-muted">{t("pointTodd", { act: n(params.activation, 0) })}</p>
              <p className="fr-num font-heading text-fr-h3 text-accent">
                {!a.point.ids.length ? "—" : a.point.reach == null ? t("notReachedLong", { end: s(a.tEndData) }) : s(a.point.tOdd)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-fr-sm text-muted">{t("pointTracks")}</span>
            {a.transmission.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5 rounded-chip border border-hairline px-2 py-1 font-mono text-fr-sm text-ink">
                <input type="checkbox" checked={ids.includes(r.id)} onChange={() => toggle(r.id)} className="accent-primary" />
                {r.id}
              </label>
            ))}
          </div>
          <p className="mt-2 text-fr-sm text-faint">{t("pointHint")}</p>
          {a.point.someNeverBelow && <p className="mt-1 text-fr-sm text-warn">{t("pointNeverBelow")}</p>}
          {last.length > 0 && a.point.reach == null && (
            <p className="mt-2 text-fr-sm text-muted">
              {t("lastReal", {
                list: last
                  .map((r) => {
                    const rr = realTransmission(r.last!.value, params);
                    return `${r.id}: ${n(r.last!.value)} → ${n(rr.mean)} ± ${n(rr.sd)} %/m`;
                  })
                  .join("; "),
              })}
            </p>
          )}
        </div>
      ) : (
        <p className="text-fr-sm text-muted">{t("noTransmission")}</p>
      )}

      {/* Tory */}
      {a.transmission.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-hairline">
          <table className={`${tableCls} min-w-[760px]`}>
            <thead><tr className={theadRowCls}>{headTracks.map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-hairline-soft">
              {rowsTracks.map((r) => (
                <tr key={r[0]} className="bg-panel">
                  <td className={`${tdCls} font-mono text-ink`}>{r[0]}</td>
                  <td className={tdNumCls}>{r[1]}</td>
                  <td className={tdCls}>{r[2]}</td>
                  <td className={`${tdNumCls} text-ink`}>{r[3]}</td>
                  <td className={tdNumCls}>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Niepewność */}
      {a.uncertainty.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-fr-micro uppercase text-faint">{t("uncTitle")}</p>
          <div className="overflow-x-auto rounded-card border border-hairline">
            <table className={`${tableCls} min-w-[640px]`}>
              <thead><tr className={theadRowCls}>{headUnc.map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-hairline-soft">
                {rowsUnc.map((r) => (
                  <tr key={r[0]} className="bg-panel">
                    {r.map((c, i) => <td key={i} className={i === 0 ? tdCls : tdNumCls}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-fr-sm text-faint">{t("uncHint")}</p>
        </div>
      )}

      {/* Strumienie */}
      {a.flows.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-fr-micro uppercase text-faint">{t("flowTitle", { act: n(params.activation, 0) })}</p>
          <div className="overflow-x-auto rounded-card border border-hairline">
            <table className={`${tableCls} min-w-[640px]`}>
              <thead>
                <tr className={theadRowCls}>
                  {[t("colDevice"), t("colMean"), t("colVolume"), t("colReal")].map((h) => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {a.flows.map((f) => (
                  <tr key={f.id} className="bg-panel">
                    <td className={`${tdCls} font-mono text-ink`}>{f.id}</td>
                    <td className={`${tdNumCls} text-ink`}>{n(f.meanAfter, 2)} m³/s</td>
                    <td className={tdNumCls}>{f.volumeAfter == null ? "—" : `${n(f.volumeAfter, 0)} m³`}</td>
                    <td className={tdNumCls}>{f.real ? `${n(f.real.mean, 2)} ± ${n(f.real.sd, 2)} m³/s` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-fr-sm text-faint">
            {t("flowHint", { delta: n(FLOW_UNCERTAINTY.delta, 2), sigma: n(FLOW_UNCERTAINTY.sigma * 100, 0) })}
          </p>
        </div>
      )}

      {/* Moc źródła */}
      {a.hrr && (
        <div className="rounded-card border border-hairline bg-panel p-5">
          <p className="font-mono text-fr-micro uppercase text-faint">{t("hrrTitle")}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><p className="text-fr-sm text-muted">{t("hrrPlateau")}</p><p className="fr-num font-heading text-fr-h4 text-ink">{n(a.hrr.plateau)} kW</p></div>
            <div><p className="text-fr-sm text-muted">{t("hrrMax")}</p><p className="fr-num font-heading text-fr-h4 text-ink">{n(a.hrr.max.value)} kW @ {n(a.hrr.max.t, 0)} s</p></div>
            <div><p className="text-fr-sm text-muted">{t("hrrEnergy")}</p><p className="fr-num font-heading text-fr-h4 text-ink">{n(a.hrr.energyMJ)} MJ</p></div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Btn size="sm" onClick={copyTables}>{copied ? t("copied") : t("copy")}</Btn>
        <Btn size="sm" variant="secondary" onClick={downloadCsv}>{t("csv")}</Btn>
        <span className="text-fr-sm text-faint">{t("noVerdict")}</span>
      </div>
    </div>
  );
}
