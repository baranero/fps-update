"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { parseDevcCsv, parseHrrCsv, computeActivations, type FdsCsvSeries } from "@/lib/fds/devc";
import type { FdsDevc } from "@/lib/fds/parser";
import { chartTheme, fmtT, fmtVal, useIsDark, OVERFLOW_DASH } from "@/components/Cloud/chartTheme";

interface LiveChartsProps {
  devcCsv: string | null;
  hrrCsv: string | null;
  setpoints: FdsDevc[] | null;
  running: boolean;
}


// Zbuduj dane dla recharts z serii o wspólnej osi czasu (z opcjonalnym przerzedzeniem)
function buildRows(time: number[], series: FdsCsvSeries[]): Array<Record<string, number | null>> {
  const stride = time.length > 800 ? Math.ceil(time.length / 800) : 1;
  const rows: Array<Record<string, number | null>> = [];
  for (let i = 0; i < time.length; i += stride) {
    const row: Record<string, number | null> = { t: time[i] };
    for (const s of series) {
      const v = s.values[i];
      row[s.name] = Number.isNaN(v) ? null : v;
    }
    rows.push(row);
  }
  return rows;
}

export default function LiveCharts({ devcCsv, hrrCsv, setpoints, running }: LiveChartsProps) {
  const t = useTranslations("symDetail");
  const dark = useIsDark();
  const { ramp, axis, grid, tooltip: tooltipStyle } = chartTheme(dark);

  const devc = useMemo(() => parseDevcCsv(devcCsv), [devcCsv]);
  const hrr = useMemo(() => parseHrrCsv(hrrCsv), [hrrCsv]);
  const activations = useMemo(() => computeActivations(devc, setpoints), [devc, setpoints]);

  // Kolor przypisany na stałe do nazwy serii (po kolejności w pliku)
  // Kolor idzie za NAZWĄ serii (kolejność w pliku), nie za jej pozycją na
  // wykresie — odfiltrowanie serii nie przemalowuje pozostałych.
  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    devc?.series.forEach((s, i) => map.set(s.name, ramp[i] ?? (dark ? "#9A9DA3" : "#5C636E")));
    return map;
  }, [devc, ramp, dark]);

  // Serie ponad piątą: neutralny kolor + własny wzór kreskowania (kodowanie
  // złożone), zamiast powtarzania hue z początku palety.
  const dashOf = useMemo(() => {
    const map = new Map<string, string | undefined>();
    devc?.series.forEach((s, i) => {
      map.set(s.name, i < ramp.length ? undefined : OVERFLOW_DASH[(i - ramp.length) % OVERFLOW_DASH.length]);
    });
    return map;
  }, [devc, ramp]);

  // Grupowanie serii DEVC po jednostce (osobne skale/wykresy)
  const groups = useMemo(() => {
    const m = new Map<string, FdsCsvSeries[]>();
    for (const s of devc?.series ?? []) {
      const u = s.unit || "—";
      if (!m.has(u)) m.set(u, []);
      m.get(u)!.push(s);
    }
    return Array.from(m.entries()); // [unit, series[]]
  }, [devc]);

  // Widoczność serii — domyślnie te z „BEAM" w nazwie, inaczej pierwsza seria
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current || !devc?.series.length) return;
    const beam = devc.series.filter((s) => /beam/i.test(s.name)).map((s) => s.name);
    setVisible(new Set(beam.length ? beam : [devc.series[0].name]));
    initedRef.current = true;
  }, [devc]);

  const toggle = (name: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const hrrSeries =
    hrr?.series.find((s) => s.name.toUpperCase() === "HRR") ?? hrr?.series[0] ?? null;
  const hrrRows = useMemo(
    () => (hrr && hrrSeries ? buildRows(hrr.time, [hrrSeries]) : []),
    [hrr, hrrSeries]
  );

  const hasAny = !!devc?.series.length || !!hrrSeries;

  if (!hasAny) {
    if (!running) return null;
    // Diagnostyka: rozróżnij „brak danych z serwera" od „dane są, ale nie dają się odczytać"
    const hrrLen = hrrCsv?.length ?? 0;
    const devcLen = devcCsv?.length ?? 0;
    const gotData = hrrLen > 0 || devcLen > 0;
    return (
      <div className="rounded-card border border-hairline bg-panel p-5">
        <p className="text-fr-body font-semibold text-ink mb-1">{t("live.title")}</p>
        <p className="text-fr-sm text-muted text-center py-4 max-w-lg mx-auto">{t("live.waiting")}</p>
        {gotData && (
          <p className="text-fr-sm text-warn text-center font-mono">
            {t("live.diag", { hrr: hrrLen, devc: devcLen })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-hairline bg-panel">
      <div className="fr-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-hairline-soft">
        <span className="font-mono text-fr-label uppercase text-muted">{t("live.title")}</span>
        {running && (
          <span className="font-mono text-fr-label uppercase text-muted">{t("live.refresh")}</span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* HRR */}
        {hrrSeries && (
          <div>
            <p className="mb-3 font-mono text-fr-label uppercase text-muted">
              {t("live.hrrTitle")} {hrrSeries.unit ? `[${hrrSeries.unit}]` : ""}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hrrRows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]}
                  tickFormatter={fmtT} tick={{ fontSize: 12, fill: axis }} stroke={axis}
                  label={{ value: t("live.timeAxis"), position: "insideBottomRight", offset: -2, fontSize: 12, fill: axis }} />
                <YAxis tick={{ fontSize: 12, fill: axis }} stroke={axis} width={56} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `t = ${fmtT(Number(v))} s`} formatter={(v) => fmtVal(v as number)} />
                <Line type="monotone" dataKey={hrrSeries.name} stroke={ramp[0]} dot={false}
                  isAnimationActive={false} connectNulls strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* DEVC — przełączniki serii */}
        {!!devc?.series.length && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-fr-label uppercase text-muted">
                {t("live.devcTitle", { count: devc.series.length })}
              </p>
              <span className="font-mono text-fr-label text-muted">{t("live.toggleHint")}</span>
            </div>

            <div className="space-y-2 mb-3">
              {groups.map(([unit, series]) => (
                <div key={unit} className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 shrink-0 font-mono text-fr-label text-muted">
                    [{unit}]
                  </span>
                  {series.map((s) => {
                    const on = visible.has(s.name);
                    const c = colorOf.get(s.name)!;
                    return (
                      <button key={s.name} onClick={() => toggle(s.name)}
                        className={`flex items-center gap-2 rounded-chip border px-2.5 py-1.5 text-fr-sm font-medium transition-colors ${
                          on
                            ? "border-transparent text-white"
                            : "border-hairline text-muted hover:bg-panel-deep"
                        }`}
                        style={on ? { backgroundColor: c } : undefined}>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: on ? "rgba(255,255,255,0.9)" : c }} />
                        <span className="truncate max-w-[160px]">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Osobny wykres na każdą jednostkę z widoczną serią */}
            <div className="space-y-4">
              {groups.map(([unit, series]) => {
                const shown = series.filter((s) => visible.has(s.name));
                if (!shown.length) return null;
                const rows = buildRows(devc.time, shown);
                return (
                  <div key={unit}>
                    <p className="mb-2 font-mono text-fr-label uppercase text-muted">{t("live.unit", { unit })}</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                        <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]}
                          tickFormatter={fmtT} tick={{ fontSize: 12, fill: axis }} stroke={axis}
                          label={{ value: t("live.timeAxis"), position: "insideBottomRight", offset: -2, fontSize: 12, fill: axis }} />
                        <YAxis tick={{ fontSize: 12, fill: axis }} stroke={axis} width={56} />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `t = ${fmtT(Number(v))} s`} formatter={(v) => fmtVal(v as number)} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {shown.map((s) => (
                          <Line key={s.name} type="monotone" dataKey={s.name}
                            stroke={colorOf.get(s.name)} strokeDasharray={dashOf.get(s.name)} dot={false}
                            isAnimationActive={false} connectNulls strokeWidth={2} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Aktywacje DEVC (setpointy) */}
        {activations.length > 0 && (
          <div>
            <p className="mb-3 font-mono text-fr-label uppercase text-muted">
              {t("live.activations")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activations.map((a) => (
                <div key={a.id}
                  className={`flex items-center justify-between rounded border px-3 py-2 text-fr-sm ${
                    a.tActivated != null
                      ? "border-signal/30 bg-signal/[0.07]"
                      : "border-hairline-soft bg-canvas"
                  }`}>
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-ink truncate">{a.id}</p>
                    <p className="text-fr-sm text-faint">
                      {a.quantity ?? "—"} · {t("live.threshold")} {a.setpoint}
                    </p>
                  </div>
                  <span className={`font-mono font-bold shrink-0 ml-2 ${
                    a.tActivated != null ? "text-signal" : "text-faint"
                  }`}>
                    {a.tActivated != null ? `${fmtT(a.tActivated)} s` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
