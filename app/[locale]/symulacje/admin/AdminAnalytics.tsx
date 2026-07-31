"use client";

import { useEffect, useMemo, useState } from "react";
import { ACTIVE_STATUSES, isFailed, statusChart } from "@/lib/status";
import { useIsDark } from "@/components/Cloud/chartTheme";
import { MonthlyBars, MonthlyVolume, ServerShare, StatusDonut } from "@/components/Cloud/charts";
import { fmtCells, fmtHours, fmtPrice } from "@/lib/format";
import {
  Kpi, SectionLabel, Skeleton, cardCls, tableCls, tdNumCls, thCls, theadRowCls, trCls,
} from "@/components/Cloud/ui";

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

function buildStatus(rows: Row[], dark: boolean) {
  const palette   = statusChart(dark);
  const done      = rows.filter((s) => s.status === "done").length;
  const active    = rows.filter((s) => ACTIVE_STATUSES.has(s.status)).length;
  const failed    = rows.filter((s) => isFailed(s.status)).length;
  const cancelled = rows.filter((s) => s.status === "cancelled").length;
  return [
    { name: "Zakończone", value: done,      color: palette.done },
    { name: "W toku",     value: active,    color: palette.active },
    { name: "Błędy",      value: failed,    color: palette.failed },
    { name: "Anulowane",  value: cancelled, color: palette.cancelled },
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
  const statuses = useMemo(() => buildStatus(rows, dark), [rows, dark]);
  const servers  = useMemo(() => buildServers(rows), [rows]);
  const topUsers = useMemo(() => buildTopUsers(rows), [rows]);

  const done = rows.filter((s) => s.status === "done");
  const revenue = done.reduce((s, i) => s + (i.price ?? 0), 0);
  const unpaid = done.filter((s) => s.payment_status !== "paid").reduce((s, i) => s + (i.price ?? 0), 0);
  const hours = rows.reduce((s, i) => s + (i.wall_hours ?? 0), 0);
  const cells = rows.reduce((s, i) => s + (i.total_cells ?? 0), 0);
  const avg = done.length > 0 ? revenue / done.length : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="py-10 text-center text-fr-sm text-muted">Brak danych do analizy.</p>;
  }

  return (
    <div className="space-y-8">

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Przychód" value={fmtPrice(revenue)} tone="primary" />
        <Kpi label="Do zapłaty" value={fmtPrice(unpaid)} tone={unpaid > 0 ? "warn" : "ink"} />
        <Kpi label="Zakończone" value={String(done.length)} />
        <Kpi label="Śr. wartość" value={avg > 0 ? fmtPrice(Math.round(avg)) : "—"} />
        <Kpi label="Czas obliczeń" value={fmtHours(hours)} />
        <Kpi label="Komórki łącznie" value={fmtCells(cells)} />
      </div>

      {/* Przychód po miesiącach */}
      <div>
        <SectionLabel className="mb-3 block">Przychód po miesiącach (zł)</SectionLabel>
        <MonthlyBars data={monthly} dataKey="przychod" tipLabel="Przychód" format={fmtPrice} />
      </div>

      {/* Wolumen + godziny */}
      <div>
        <SectionLabel className="mb-3 block">Liczba zleceń i czas obliczeń po miesiącach</SectionLabel>
        <MonthlyVolume data={monthly} gradientId="admin" countLabel="Zlecenia" />
      </div>

      {/* Dolny rząd */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Statusy donut */}
        <div>
          <SectionLabel className="mb-3 block">Rozkład statusów</SectionLabel>
          <StatusDonut data={statuses} total={rows.length} />
        </div>

        {/* Serwery */}
        <div>
          <SectionLabel className="mb-3 block">Typ serwera obliczeniowego</SectionLabel>
          <ServerShare data={servers} total={rows.length} />
        </div>
      </div>

      {/* Top klienci */}
      <div>
        <SectionLabel className="mb-3 block">Najlepsi klienci (przychód)</SectionLabel>
        <div className={`${cardCls} overflow-hidden`}>
          <table className={tableCls}>
            <thead>
              <tr className={theadRowCls}>
                {["#", "Email", "Zakończone", "Przychód"].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft">
              {topUsers.map((u, i) => (
                <tr key={u.email} className={trCls}>
                  <td className={tdNumCls}>{i + 1}</td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 font-mono text-ink">{u.email}</td>
                  <td className={tdNumCls}>{u.count}</td>
                  <td className={`${tdNumCls} text-primary`}>{fmtPrice(u.revenue)}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-fr-sm text-muted">Brak zakończonych zleceń.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
