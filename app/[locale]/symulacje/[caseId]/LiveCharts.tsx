"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { parseDevcCsv, parseHrrCsv, computeActivations, type FdsCsvSeries } from "@/lib/fds/devc";
import type { FdsDevc } from "@/lib/fds/parser";

interface LiveChartsProps {
  devcCsv: string | null;
  hrrCsv: string | null;
  setpoints: FdsDevc[] | null;
  running: boolean;
}

// Paleta serii — czytelna w trybie jasnym i ciemnym
const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#0d9488",
  "#4f46e5", "#be123c", "#059669", "#9333ea", "#c026d3",
];

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function fmtT(t: number): string {
  return t >= 100 ? `${Math.round(t)}` : t.toFixed(1);
}

// Wartość odczytywana z wykresu — zawsze 2 miejsca po przecinku
function fmtVal(v: number | string | Array<number | string>): string {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : "—";
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
  const dark = useIsDark();
  const axis = dark ? "#94a3b8" : "#64748b";
  const grid = dark ? "#334155" : "#e2e8f0";
  const tooltipStyle = {
    backgroundColor: dark ? "#0B1120" : "#fff",
    border: `1px solid ${grid}`,
    borderRadius: 8,
    fontSize: 12,
  };

  const devc = useMemo(() => parseDevcCsv(devcCsv), [devcCsv]);
  const hrr = useMemo(() => parseHrrCsv(hrrCsv), [hrrCsv]);
  const activations = useMemo(() => computeActivations(devc, setpoints), [devc, setpoints]);

  // Kolor przypisany na stałe do nazwy serii (po kolejności w pliku)
  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    devc?.series.forEach((s, i) => map.set(s.name, COLORS[i % COLORS.length]));
    return map;
  }, [devc]);

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
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Wyniki na żywo</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4 max-w-lg mx-auto">
          Czekam na pierwsze wyniki z serwera. Wykres <span className="font-semibold">HRR</span> pojawia się dla każdej
          symulacji, gdy FDS zapisze pierwsze kroki czasowe; wykresy <span className="font-semibold">DEVC</span> —
          gdy model ma zdefiniowane urządzenia pomiarowe (czujki, BEAM, termopary…).
        </p>
        {gotData && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-mono">
            diag: odebrano HRR {hrrLen} zn., DEVC {devcLen} zn. — ale nie udało się odczytać jako CSV
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Wyniki na żywo</span>
        {running && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">odświeżanie co 3 s</span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* HRR */}
        {hrrSeries && (
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              HRR — moc pożaru {hrrSeries.unit ? `[${hrrSeries.unit}]` : ""}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hrrRows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]}
                  tickFormatter={fmtT} tick={{ fontSize: 11, fill: axis }} stroke={axis}
                  label={{ value: "czas [s]", position: "insideBottomRight", offset: -2, fontSize: 10, fill: axis }} />
                <YAxis tick={{ fontSize: 11, fill: axis }} stroke={axis} width={56} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `t = ${fmtT(Number(v))} s`} formatter={(v) => fmtVal(v as number)} />
                <Line type="monotone" dataKey={hrrSeries.name} stroke="#dc2626" dot={false}
                  isAnimationActive={false} connectNulls strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* DEVC — przełączniki serii */}
        {!!devc?.series.length && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Urządzenia DEVC ({devc.series.length})
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">kliknij, aby pokazać/ukryć serię</span>
            </div>

            <div className="space-y-2 mb-3">
              {groups.map(([unit, series]) => (
                <div key={unit} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mr-1 shrink-0">
                    [{unit}]
                  </span>
                  {series.map((s) => {
                    const on = visible.has(s.name);
                    const c = colorOf.get(s.name) ?? "#64748b";
                    return (
                      <button key={s.name} onClick={() => toggle(s.name)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          on
                            ? "border-transparent text-white"
                            : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
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
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-1">jednostka: {unit}</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                        <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]}
                          tickFormatter={fmtT} tick={{ fontSize: 11, fill: axis }} stroke={axis}
                          label={{ value: "czas [s]", position: "insideBottomRight", offset: -2, fontSize: 10, fill: axis }} />
                        <YAxis tick={{ fontSize: 11, fill: axis }} stroke={axis} width={56} />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `t = ${fmtT(Number(v))} s`} formatter={(v) => fmtVal(v as number)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {shown.map((s) => (
                          <Line key={s.name} type="monotone" dataKey={s.name}
                            stroke={colorOf.get(s.name) ?? "#64748b"} dot={false}
                            isAnimationActive={false} connectNulls strokeWidth={1.6} />
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
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Aktywacje DEVC (setpointy)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activations.map((a) => (
                <div key={a.id}
                  className={`flex items-center justify-between rounded border px-3 py-2 text-xs ${
                    a.tActivated != null
                      ? "border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20"
                      : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120]"
                  }`}>
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">{a.id}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {a.quantity ?? "—"} · próg {a.setpoint}
                    </p>
                  </div>
                  <span className={`font-mono font-bold shrink-0 ml-2 ${
                    a.tActivated != null ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"
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
