"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { ACTIVE_STATUSES, isFailed, STATUS_CHART } from "@/lib/status";

type Row = {
  case_id: string;
  email: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  price: number | null;
  server_type: string | null;
  wall_hours: number | null;
  total_cells: number | null;
  payment_status: "paid" | "pending" | null;
};

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

function buildMonthly(rows: Row[]) {
  const map = new Map<string, { month: string; przychod: number; szt: number; godziny: number }>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pl-PL", { month: "short", year: "2-digit" });
    map.set(key, { month: label.charAt(0).toUpperCase() + label.slice(1), przychod: 0, szt: 0, godziny: 0 });
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key);
    if (entry) {
      entry.szt += 1;
      entry.godziny += r.wall_hours ?? 0;
      if (r.status === "done") entry.przychod += r.price ?? 0;
    }
  }
  return Array.from(map.values());
}

function buildStatus(rows: Row[]) {
  const done      = rows.filter((s) => s.status === "done").length;
  const active    = rows.filter((s) => ACTIVE_STATUSES.has(s.status)).length;
  const failed    = rows.filter((s) => isFailed(s.status)).length;
  const cancelled = rows.filter((s) => s.status === "cancelled").length;
  return [
    { name: "Zakończone", value: done,      color: STATUS_CHART.done },
    { name: "W toku",     value: active,    color: STATUS_CHART.active },
    { name: "Błędy",      value: failed,    color: STATUS_CHART.failed },
    { name: "Anulowane",  value: cancelled, color: STATUS_CHART.cancelled },
  ].filter((d) => d.value > 0);
}

function buildServers(rows: Row[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.server_type ?? "nieznany";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name: name.toUpperCase(), count }))
    .sort((a, b) => b.count - a.count);
}

function buildTopUsers(rows: Row[]) {
  const map = new Map<string, { revenue: number; count: number }>();
  for (const r of rows) {
    if (r.status !== "done") continue;
    const cur = map.get(r.email) ?? { revenue: 0, count: 0 };
    cur.revenue += r.price ?? 0;
    cur.count += 1;
    map.set(r.email, cur);
  }
  return Array.from(map.entries())
    .map(([email, v]) => ({ email, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{children}</h2>;
}

export default function AdminAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const dark = useIsDark();

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.data)) setRows(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const monthly  = useMemo(() => buildMonthly(rows), [rows]);
  const statuses = useMemo(() => buildStatus(rows), [rows]);
  const servers  = useMemo(() => buildServers(rows), [rows]);
  const topUsers = useMemo(() => buildTopUsers(rows), [rows]);

  const tickColor = dark ? "#64748b" : "#94a3b8";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";
  const axisColor = dark ? "#334155" : "#e2e8f0";

  const done = rows.filter((s) => s.status === "done");
  const revenue = done.reduce((s, i) => s + (i.price ?? 0), 0);
  const unpaid = done.filter((s) => s.payment_status !== "paid").reduce((s, i) => s + (i.price ?? 0), 0);
  const hours = rows.reduce((s, i) => s + (i.wall_hours ?? 0), 0);
  const cells = rows.reduce((s, i) => s + (i.total_cells ?? 0), 0);
  const avg = done.length > 0 ? revenue / done.length : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">Brak danych do analizy.</p>;
  }

  return (
    <div className="space-y-8">

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Przychód" value={`${revenue.toLocaleString("pl-PL")} zł`} accent />
        <Kpi label="Do zapłaty" value={`${unpaid.toLocaleString("pl-PL")} zł`} cls={unpaid > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
        <Kpi label="Zakończone" value={String(done.length)} />
        <Kpi label="Śr. wartość" value={avg > 0 ? `${avg.toFixed(0)} zł` : "—"} />
        <Kpi label="Czas obliczeń" value={hours >= 1 ? `${hours.toFixed(0)} h` : `${Math.round(hours * 60)} min`} />
        <Kpi label="Komórki łącznie" value={cells >= 1_000_000 ? `${(cells / 1_000_000).toFixed(1)} M` : `${Math.round(cells / 1000)} tys.`} />
      </div>

      {/* Przychód po miesiącach */}
      <div>
        <SectionTitle>Przychód po miesiącach (zł)</SectionTitle>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={{ stroke: axisColor }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => v === 0 ? "0" : `${v} zł`} />
              <Tooltip
                cursor={{ fill: dark ? "#1e293b" : "#f8fafc" }}
                content={({ active, payload, label }: any) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                      <p className="text-slate-500 dark:text-slate-400">Przychód: <span className="font-bold text-slate-800 dark:text-white">{payload[0].value.toLocaleString("pl-PL")} zł</span></p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="przychod" fill="#DC3545" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wolumen + godziny */}
      <div>
        <SectionTitle>Liczba zleceń i czas obliczeń po miesiącach</SectionTitle>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="aSzt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC3545" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#DC3545" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={{ stroke: axisColor }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ stroke: dark ? "#334155" : "#e2e8f0", strokeWidth: 1 }}
                content={({ active, payload, label }: any) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                      <p className="text-slate-500 dark:text-slate-400">Zlecenia: <span className="font-bold text-slate-800 dark:text-white">{payload[0].value}</span></p>
                      {payload[1] && <p className="text-slate-500 dark:text-slate-400">Godziny: <span className="font-bold text-slate-800 dark:text-white">{payload[1].value.toFixed(1)} h</span></p>}
                    </div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="szt" stroke="#DC3545" strokeWidth={2} fill="url(#aSzt)" dot={false} />
              <Area type="monotone" dataKey="godziny" stroke="#6366f1" strokeWidth={2} fill="url(#aH)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-end">
            <div className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-primary inline-block" /><span className="text-[11px] text-slate-500 dark:text-slate-400">Zlecenia (szt.)</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-indigo-500 inline-block" /><span className="text-[11px] text-slate-500 dark:text-slate-400">Czas obliczeń (h)</span></div>
          </div>
        </div>
      </div>

      {/* Dolny rząd */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Statusy donut */}
        <div>
          <SectionTitle>Rozkład statusów</SectionTitle>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statuses} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {statuses.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2 text-xs shadow-lg">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{d.name}</p>
                        <p className="text-slate-500 dark:text-slate-400"><span className="font-bold text-slate-800 dark:text-white">{d.value}</span> szt. ({((d.value / rows.length) * 100).toFixed(0)}%)</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {statuses.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{s.name} <span className="font-semibold text-slate-700 dark:text-slate-300">({s.value})</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Serwery */}
        <div>
          <SectionTitle>Typ serwera obliczeniowego</SectionTitle>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
            <div className="space-y-3 py-2">
              {servers.map((s) => {
                const pct = Math.round((s.count / rows.length) * 100);
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{s.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{s.count} szt. · {pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top klienci */}
      <div>
        <SectionTitle>Najlepsi klienci (przychód)</SectionTitle>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                {["#", "Email", "Zakończone", "Przychód"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topUsers.map((u, i) => (
                <tr key={u.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{u.email}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">{u.count}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-primary">{u.revenue.toLocaleString("pl-PL")} zł</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Brak zakończonych zleceń.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function Kpi({ label, value, cls, accent }: { label: string; value: string; cls?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${cls ?? (accent ? "text-primary" : "text-slate-800 dark:text-white")}`}>{value}</p>
    </div>
  );
}
