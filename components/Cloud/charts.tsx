"use client";

import { ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { SERIES_LIGHT, chartTheme, useIsDark } from "@/components/Cloud/chartTheme";
import { Meter, cardCls } from "@/components/Cloud/ui";

// ── Wykresy chmury ───────────────────────────────────────────────────────────
// Statystyki użytkownika i analityka admina pokazują to samo w dwóch skalach
// (moje zlecenia vs wszystkie). Wcześniej obie strony miały własne kopie
// wykresów — te same osie, ale inne odcienie, inne ramki podpowiedzi i inna
// legenda. Tutaj jest jeden komplet: oś i siatka z `chartTheme`, serie ze
// zwalidowanej palety, typografia w skali `fr-*`.

// Dwie pierwsze serie zwalidowanej palety: czerwień marki + stal.
export const [SERIES_A, SERIES_B] = SERIES_LIGHT;

/* ── Ramka podpowiedzi ───────────────────────────────────────────────────── */
export function ChartTip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className={`${cardCls} px-3 py-2 shadow-fr-float`}>
      <p className="mb-1 font-mono text-fr-label uppercase text-muted">{label}</p>
      <div className="fr-num font-mono text-fr-sm text-ink">{children}</div>
    </div>
  );
}

/* ── Legenda ─────────────────────────────────────────────────────────────── */
export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-4">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-2 font-mono text-fr-micro uppercase text-muted">
          <span className="inline-block h-1.5 w-4 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ── Słupki miesięczne (koszt / przychód) ────────────────────────────────── */
export function MonthlyBars({
  data,
  dataKey,
  tipLabel,
  format,
}: {
  data: any[];
  dataKey: string;
  tipLabel: string;
  format: (v: number) => string;
}) {
  const theme = chartTheme(useIsDark());
  return (
    <div className={`${cardCls} p-5`}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.axis }} axisLine={{ stroke: theme.grid }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: theme.axis }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v === 0 ? "0" : `${v} zł`)}
          />
          <Tooltip
            cursor={{ fill: theme.grid }}
            content={({ active, payload, label }: any) =>
              active && payload?.length ? (
                <ChartTip label={label}>{tipLabel}: {format(payload[0].value)}</ChartTip>
              ) : null
            }
          />
          <Bar dataKey={dataKey} fill={SERIES_A} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Wolumen + czas obliczeń ─────────────────────────────────────────────── */
export function MonthlyVolume({
  data,
  gradientId,
  countLabel,
}: {
  data: any[];
  gradientId: string;
  countLabel: string;
}) {
  const theme = chartTheme(useIsDark());
  return (
    <div className={`${cardCls} p-5`}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}-count`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES_A} stopOpacity={0.15} />
              <stop offset="95%" stopColor={SERIES_A} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${gradientId}-hours`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES_B} stopOpacity={0.15} />
              <stop offset="95%" stopColor={SERIES_B} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.axis }} axisLine={{ stroke: theme.grid }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: theme.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: theme.grid, strokeWidth: 1 }}
            content={({ active, payload, label }: any) =>
              active && payload?.length ? (
                <ChartTip label={label}>
                  <p>{countLabel}: {payload[0].value}</p>
                  {payload[1] && <p>Godziny: {payload[1].value.toFixed(1)} h</p>}
                </ChartTip>
              ) : null
            }
          />
          <Area type="monotone" dataKey="szt" stroke={SERIES_A} strokeWidth={2} fill={`url(#${gradientId}-count)`} dot={false} />
          <Area type="monotone" dataKey="godziny" stroke={SERIES_B} strokeWidth={2} fill={`url(#${gradientId}-hours)`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { color: SERIES_A, label: `${countLabel} (szt.)` },
          { color: SERIES_B, label: "Czas obliczeń (h)" },
        ]}
      />
    </div>
  );
}

/* ── Rozkład statusów ────────────────────────────────────────────────────── */
export function StatusDonut({
  data,
  total,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
}) {
  if (data.length === 0) {
    return (
      <div className={`${cardCls} p-5`}>
        <p className="py-8 text-center text-fr-sm text-muted">Brak danych.</p>
      </div>
    );
  }
  return (
    <div className={`${cardCls} p-5`}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <ChartTip label={d.name}>
                  {d.value} szt. ({((d.value / total) * 100).toFixed(0)}%)
                </ChartTip>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        {data.map((s) => (
          <span key={s.name} className="flex items-center gap-2 font-mono text-fr-micro uppercase text-muted">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            {s.name} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Udział typów serwera ────────────────────────────────────────────────── */
export function ServerShare({ data, total }: { data: { name: string; count: number }[]; total: number }) {
  return (
    <div className={`${cardCls} p-5`}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-fr-sm text-muted">Brak danych.</p>
      ) : (
        <div className="space-y-3 py-2">
          {data.map((s) => {
            const pct = Math.round((s.count / total) * 100);
            return (
              <div key={s.name}>
                <div className="mb-1.5 flex items-center justify-between font-mono text-fr-sm">
                  <span className="text-ink">{s.name}</span>
                  <span className="fr-num text-muted">{s.count} szt. · {pct}%</span>
                </div>
                <Meter pct={pct} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
