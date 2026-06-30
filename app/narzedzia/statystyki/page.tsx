"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

type Item = {
  case_id: string;
  status: string;
  created_at: string;
  price: number;
  wall_hours: number;
  server_type: string | null;
  total_cells: number;
};

const ACTIVE = new Set(["pending", "dispatched", "running"]);

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

function buildMonthlyData(items: Item[]) {
  const map = new Map<string, { month: string; koszt: number; szt: number; godziny: number }>();

  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pl-PL", { month: "short", year: "2-digit" });
    map.set(key, { month: label.charAt(0).toUpperCase() + label.slice(1), koszt: 0, szt: 0, godziny: 0 });
  }

  for (const item of items) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) {
      const entry = map.get(key)!;
      entry.szt += 1;
      entry.koszt += item.price;
      entry.godziny += item.wall_hours;
    }
  }

  return Array.from(map.values());
}

function buildStatusData(items: Item[]) {
  const done    = items.filter((s) => s.status === "done").length;
  const active  = items.filter((s) => ACTIVE.has(s.status)).length;
  const failed  = items.filter((s) => s.status === "failed" || s.status === "error").length;
  return [
    { name: "Zakończone", value: done,   color: "#22c55e" },
    { name: "W toku",     value: active, color: "#f59e0b" },
    { name: "Błędy",      value: failed, color: "#ef4444" },
  ].filter((d) => d.value > 0);
}

function buildServerData(items: Item[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.server_type ?? "nieznany";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name: name.toUpperCase(), count }))
    .sort((a, b) => b.count - a.count);
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? "text-primary" : "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{children}</h2>
  );
}

const CustomTooltipCost = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-slate-500 dark:text-slate-400">
        Koszt: <span className="font-bold text-slate-800 dark:text-white">{payload[0].value.toFixed(2)} zł</span>
      </p>
    </div>
  );
};

const CustomTooltipCount = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-slate-500 dark:text-slate-400">
        Symulacje: <span className="font-bold text-slate-800 dark:text-white">{payload[0].value}</span>
      </p>
      {payload[1] && (
        <p className="text-slate-500 dark:text-slate-400">
          Godziny: <span className="font-bold text-slate-800 dark:text-white">{payload[1].value.toFixed(1)} h</span>
        </p>
      )}
    </div>
  );
};

export default function StatystykiPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const dark = useIsDark();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoggedIn(false); setLoading(false); return; }
      setLoggedIn(true);
      const res = await fetch("/api/rozliczenia");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
      setLoading(false);
    }
    load();
  }, []);

  const tickColor   = dark ? "#64748b" : "#94a3b8";
  const gridColor   = dark ? "#1e293b" : "#f1f5f9";
  const axisColor   = dark ? "#334155" : "#e2e8f0";

  const monthly    = buildMonthlyData(items);
  const statuses   = buildStatusData(items);
  const servers    = buildServerData(items);

  const totalCost  = items.filter((s) => s.status === "done").reduce((s, i) => s + i.price, 0);
  const totalHours = items.reduce((s, i) => s + i.wall_hours, 0);
  const countDone  = items.filter((s) => s.status === "done").length;
  const avgCost    = countDone > 0 ? totalCost / countDone : 0;

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ))}
    </div>
  );

  if (loggedIn === false) return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 px-6 py-12 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Zaloguj się, aby zobaczyć statystyki.</p>
      <Link href="/signin" className="text-sm font-medium text-primary hover:underline">Zaloguj się →</Link>
    </div>
  );

  if (items.length === 0) return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Statystyki</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Przegląd aktywności obliczeniowej.</p>
      </div>
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 px-6 py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Brak danych — wyślij pierwsze zlecenie FDS.</p>
        <Link href="/narzedzia/symulacje" className="text-sm font-medium text-primary hover:underline">
          Wyślij zlecenie →
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Statystyki</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Przegląd aktywności obliczeniowej — ostatnie 12 miesięcy.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Symulacje łącznie"    value={String(items.length)}                                                                    sub={`${countDone} zakończone`} />
        <KpiCard label="Łączny koszt netto"   value={`${totalCost.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`} sub="zakończone" />
        <KpiCard label="Łączny czas obliczeń" value={totalHours >= 1 ? `${totalHours.toFixed(1)} h` : `${Math.round(totalHours * 60)} min`}  sub="wall time" />
        <KpiCard label="Śr. koszt / sym."     value={avgCost > 0 ? `${avgCost.toFixed(2)} zł` : "—"}                                         sub="zakończone" accent />
      </div>

      {/* Koszty po miesiącach */}
      <div>
        <SectionTitle>Koszty netto po miesiącach (zł)</SectionTitle>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={{ stroke: axisColor }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v === 0 ? "0" : `${v} zł`} />
              <Tooltip content={<CustomTooltipCost />} cursor={{ fill: dark ? "#1e293b" : "#f8fafc" }} />
              <Bar dataKey="koszt" fill="#DC3545" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Liczba symulacji + godziny */}
      <div>
        <SectionTitle>Symulacje i czas obliczeń po miesiącach</SectionTitle>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSzt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#DC3545" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#DC3545" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={{ stroke: axisColor }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltipCount />} cursor={{ stroke: dark ? "#334155" : "#e2e8f0", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="szt"     stroke="#DC3545" strokeWidth={2} fill="url(#colorSzt)" dot={false} name="Symulacje" />
              <Area type="monotone" dataKey="godziny" stroke="#6366f1" strokeWidth={2} fill="url(#colorH)"   dot={false} name="Godziny" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-end">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-primary inline-block" />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Symulacje (szt.)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-indigo-500 inline-block" />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Czas obliczeń (h)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dolny rząd: donut + serwery */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

        {/* Rozkład statusów */}
        <div>
          <SectionTitle>Rozkład statusów</SectionTitle>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
            {statuses.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Brak danych.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statuses}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statuses.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2 text-xs shadow-lg">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{d.name}</p>
                            <p className="text-slate-500 dark:text-slate-400">
                              <span className="font-bold text-slate-800 dark:text-white">{d.value}</span> szt.
                              &nbsp;({((d.value / items.length) * 100).toFixed(0)}%)
                            </p>
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
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {s.name} <span className="font-semibold text-slate-700 dark:text-slate-300">({s.value})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Serwery */}
        <div>
          <SectionTitle>Typ serwera obliczeniowego</SectionTitle>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
            {servers.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Brak danych.</p>
            ) : (
              <div className="space-y-3 py-2">
                {servers.map((s) => {
                  const pct = Math.round((s.count / items.length) * 100);
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{s.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{s.count} szt. · {pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
