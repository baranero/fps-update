"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { parseDevcCsv, parseHrrCsv, type FdsCsvSeries } from "@/lib/fds/devc";
import { chartTheme, fmtT, fmtVal, useIsDark, OVERFLOW_DASH } from "@/components/Cloud/chartTheme";

// Wykres w środkowym panelu konsoli zlecenia. Pokazuje JEDEN zestaw naraz —
// HRR albo urządzenia DEVC pogrupowane po jednostce — z przełącznikiem u góry.
// Grupowanie po jednostce jest konieczne: dwie wielkości o różnych skalach na
// wspólnej osi Y tworzą korelację, której w danych nie ma.
//
// Parsowanie CSV i paleta pochodzą z tych samych modułów co pełny panel
// `LiveCharts` niżej — konsola nie ma własnej kopii logiki.

type Tab = { id: string; label: string; unit: string; series: FdsCsvSeries[]; time: number[] };

export default function ConsoleChart({
  devcCsv,
  hrrCsv,
}: {
  devcCsv: string | null;
  hrrCsv: string | null;
}) {
  const t = useTranslations("symDetail.console");
  const dark = useIsDark();
  const { ramp, axis, grid, tooltip } = chartTheme(dark);

  const devc = useMemo(() => parseDevcCsv(devcCsv), [devcCsv]);
  const hrr = useMemo(() => parseHrrCsv(hrrCsv), [hrrCsv]);

  const tabs = useMemo<Tab[]>(() => {
    const out: Tab[] = [];

    const hrrSeries = hrr?.series.find((s) => /^hrr$/i.test(s.name)) ?? hrr?.series[0];
    if (hrr && hrrSeries) {
      out.push({ id: "hrr", label: "HRR", unit: hrrSeries.unit || "kW", series: [hrrSeries], time: hrr.time });
    }

    // DEVC rozbite po jednostce — każda jednostka to własna skala, więc
    // własna zakładka. Nigdy dwie osie Y na jednym wykresie.
    const byUnit = new Map<string, FdsCsvSeries[]>();
    for (const s of devc?.series ?? []) {
      const u = s.unit || "—";
      if (!byUnit.has(u)) byUnit.set(u, []);
      byUnit.get(u)!.push(s);
    }
    // Array.from zamiast iteracji po Map — projekt celuje w ES5, gdzie
    // `for…of` po mapie wymaga downlevelIteration.
    Array.from(byUnit.entries()).forEach(([unit, series]) => {
      out.push({ id: `devc:${unit}`, label: unit === "—" ? "DEVC" : unit, unit, series, time: devc!.time });
    });

    return out;
  }, [devc, hrr]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = tabs.find((x) => x.id === (activeId ?? tabs[0]?.id)) ?? tabs[0];

  if (!tabs.length) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="font-mono text-fr-sm text-muted">{t("noChart")}</p>
      </div>
    );
  }

  // Maksymalnie 5 serii na wykresie — przy większej liczbie czujników reszta
  // zostaje w pełnym panelu niżej, gdzie da się je przełączać pojedynczo.
  const shown = active.series.slice(0, 5);
  const rows = active.time.map((tv, i) => {
    const row: Record<string, number | null> = { t: tv };
    for (const s of shown) {
      const v = s.values[i];
      row[s.name] = Number.isFinite(v) ? v : null;
    }
    return row;
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Przełącznik zestawów */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-hairline-soft px-5 py-3 md:px-8">
          {tabs.map((tab) => {
            const on = tab.id === active.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                className={`rounded-chip border px-2.5 py-1 font-mono text-fr-sm uppercase transition-colors ${
                  on
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-hairline text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 px-2 pb-4 pt-4 md:px-5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 16, left: -6, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtT}
              tick={{ fontSize: 12, fill: axis }}
              stroke={axis}
            />
            <YAxis tick={{ fontSize: 12, fill: axis }} stroke={axis} width={52} />
            <Tooltip
              contentStyle={tooltip}
              labelFormatter={(v) => `t = ${fmtT(Number(v))} s`}
              formatter={(v) => fmtVal(v as number)}
            />
            {shown.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={ramp[i] ?? (dark ? "#9A9DA3" : "#5C636E")}
                strokeDasharray={i < ramp.length ? undefined : OVERFLOW_DASH[i % OVERFLOW_DASH.length]}
                dot={false}
                isAnimationActive={false}
                connectNulls
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda — identyfikacja nigdy nie może zależeć od samego koloru */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline-soft px-5 py-3 md:px-8">
        {shown.map((s, i) => (
          <span key={s.name} className="flex items-center gap-2 font-mono text-fr-sm text-muted">
            <span
              className="h-0.5 w-4 shrink-0"
              style={{ backgroundColor: ramp[i] ?? (dark ? "#9A9DA3" : "#5C636E") }}
            />
            <span className="truncate">{s.name}</span>
          </span>
        ))}
        <span className="ml-auto shrink-0 font-mono text-fr-sm uppercase text-muted">
          [{active.unit}]
        </span>
      </div>
    </div>
  );
}
