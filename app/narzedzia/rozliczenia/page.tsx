"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Item = {
  case_id: string;
  file_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  price: number;
  wall_hours: number;
  server_type: string | null;
  total_cells: number;
  mesh_count: number | null;
};

type FilterTab = "all" | "done" | "active" | "failed";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Oczekuje",    cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
  dispatched: { label: "W kolejce",   cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  running:    { label: "W trakcie",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  done:       { label: "Zakończone",  cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  error:      { label: "Błąd",        cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  failed:     { label: "Błąd",        cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const ACTIVE_STATUSES = new Set(["pending", "dispatched", "running"]);

function formatCells(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} tys.`;
  return String(n);
}

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

function exportCsv(items: Item[]) {
  const header = ["Numer zlecenia", "Plik", "Data zlecenia", "Status", "Serwer", "Komórki", "Czas obliczeń", "Kwota netto (PLN)"];
  const rows = items.map((s) => [
    s.case_id,
    s.file_name,
    new Date(s.created_at).toLocaleDateString("pl-PL"),
    STATUS_MAP[s.status]?.label ?? s.status,
    s.server_type ?? "—",
    formatCells(s.total_cells),
    s.wall_hours > 0 ? formatHours(s.wall_hours) : "—",
    s.price.toFixed(2).replace(".", ","),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rozliczenia-fps-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Grupowanie po miesiącach
function groupByMonth(items: Item[]): Array<{ label: string; items: Item[] }> {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const [year, month] = key.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
    return { label: label.charAt(0).toUpperCase() + label.slice(1), items };
  });
}

export default function RozliczeniaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

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

  const filtered = items.filter((s) => {
    if (filter === "done") return s.status === "done";
    if (filter === "active") return ACTIVE_STATUSES.has(s.status);
    if (filter === "failed") return s.status === "failed" || s.status === "error";
    return true;
  });

  const totalDone = items.filter((s) => s.status === "done").reduce((sum, s) => sum + s.price, 0);
  const countDone = items.filter((s) => s.status === "done").length;
  const countActive = items.filter((s) => ACTIVE_STATUSES.has(s.status)).length;
  const filteredTotal = filtered.reduce((sum, s) => sum + s.price, 0);

  const groups = groupByMonth(filtered);

  const TABS: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: "all",    label: "Wszystkie",   count: items.length },
    { id: "done",   label: "Zakończone",  count: countDone },
    { id: "active", label: "W toku",      count: countActive },
    { id: "failed", label: "Błędy",       count: items.filter((s) => s.status === "failed" || s.status === "error").length },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Rozliczenia</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Historia kosztów obliczeń FDS powiązanych z Twoim kontem.
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => exportCsv(filtered)}
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Eksport CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : loggedIn === false ? (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 px-6 py-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Zaloguj się, aby zobaczyć historię rozliczeń.
          </p>
          <Link href="/signin" className="text-sm font-medium text-primary hover:underline">
            Zaloguj się →
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 px-6 py-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Brak zleconych symulacji.</p>
          <Link href="/narzedzia/symulacje" className="text-sm font-medium text-primary hover:underline">
            Wyślij pierwsze zlecenie →
          </Link>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">Łączna kwota (zakończone)</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {totalDone.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">netto</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">Zakończone symulacje</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{countDone}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {countDone === 1 ? "zlecenie" : countDone < 5 ? "zlecenia" : "zleceń"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">Symulacje w toku</p>
              <p className={`text-3xl font-bold ${countActive > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                {countActive}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {countActive > 0 ? "aktywne" : "brak aktywnych"}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  filter === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    filter === tab.id
                      ? "bg-primary/10 text-primary"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Grouped table */}
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Brak wyników dla tego filtru.</p>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.label}>
                  {/* Month header */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {group.label}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {group.items.reduce((s, i) => s + i.price, 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                    </p>
                  </div>

                  {/* Rows */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {group.items.map((s) => {
                        const st = STATUS_MAP[s.status] ?? { label: s.status, cls: "bg-slate-100 text-slate-500" };
                        return (
                          <div key={s.case_id} className="flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">

                            {/* Status badge */}
                            <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${st.cls}`}>
                              {st.label}
                            </span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {s.file_name}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{s.case_id}</span>
                                {s.server_type && (
                                  <span className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500">{s.server_type}</span>
                                )}
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                  {formatCells(s.total_cells)} komórek
                                </span>
                                {s.wall_hours > 0 && (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {formatHours(s.wall_hours)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Date */}
                            <div className="shrink-0 text-right hidden sm:block">
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {new Date(s.created_at).toLocaleDateString("pl-PL", {
                                  day: "numeric", month: "short",
                                })}
                              </p>
                              {s.completed_at && (
                                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">
                                  ukończono {new Date(s.completed_at).toLocaleDateString("pl-PL", {
                                    day: "numeric", month: "short",
                                  })}
                                </p>
                              )}
                            </div>

                            {/* Price */}
                            <div className="shrink-0 text-right">
                              <p className={`text-sm font-bold ${s.price > 0 ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
                                {s.price > 0
                                  ? `${s.price.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`
                                  : "—"}
                              </p>
                              {s.price > 0 && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">netto</p>
                              )}
                            </div>

                            {/* Link */}
                            <Link
                              href={`/narzedzia/symulacje/${s.case_id}`}
                              className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors"
                              title="Otwórz zlecenie"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E232E] px-4 py-3.5">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Suma ({filter === "all" ? "wszystkie" : TABS.find((t) => t.id === filter)?.label.toLowerCase()})
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {filteredTotal.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                  <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">netto</span>
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
