"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import AdminAnalytics from "./AdminAnalytics";
import SimDrawer from "./SimDrawer";
import { statusMeta, ADMIN_STATUS_KEYS } from "@/lib/status";
import { fmtDateTime, fmtPrice, fmtHours } from "@/lib/format";

/* ── Types ── */
type Sim = {
  case_id: string; email: string; name: string; file_name: string;
  status: string; created_at: string; completed_at: string | null;
  price: number | null; server_type: string | null; wall_hours: number | null;
  total_cells: number | null;
};
type User = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  total: number; done: number; revenue: number;
};
type Stats = {
  counts: { total: number; pending: number; running: number; done: number; failed: number; revenue: number; unpaid: number; users: number };
  recent: Sim[];
};

/* ── CSV eksport ── */
function exportSimsCsv(rows: Sim[]) {
  const header = ["Case ID", "Email", "Nazwa", "Plik", "Status", "Serwer", "Komorki", "Czas (h)", "Cena (zl)", "Utworzono", "Ukonczono"];
  const body = rows.map((r) => [
    r.case_id, r.email, r.name, r.file_name, statusMeta(r.status).label,
    r.server_type ?? "", r.total_cells ?? "", r.wall_hours ?? "",
    r.price != null ? String(r.price).replace(".", ",") : "",
    new Date(r.created_at).toLocaleString("pl-PL"),
    r.completed_at ? new Date(r.completed_at).toLocaleString("pl-PL") : "",
  ]);
  const csv = [header, ...body]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `symulacje-admin-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── KPI card ── */
function Kpi({ label, value, cls }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${cls ?? "text-slate-800 dark:text-white"}`}>{value}</p>
    </div>
  );
}

/* ── Status dropdown ── */
function StatusCell({ caseId, initial, onChange }: { caseId: string; initial: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const pick = async (s: string) => {
    setOpen(false);
    if (s === current) return;
    setSaving(true);
    const res = await fetch(`/api/admin/symulacje/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    setSaving(false);
    if (res.ok) { setCurrent(s); onChange(s); }
  };

  const cfg = statusMeta(current);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        aria-label={`Zmień status (obecnie: ${cfg.label})`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls} ${saving ? "opacity-50" : "cursor-pointer"}`}
      >
        {cfg.label}
        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="absolute top-full left-0 mt-1 z-50 w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] shadow-lg overflow-hidden">
          {ADMIN_STATUS_KEYS.map((key) => (
            <button key={key} role="option" aria-selected={key === current} onClick={() => pick(key)}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${key === current ? "text-primary" : "text-slate-700 dark:text-slate-300"}`}>
              {statusMeta(key).label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Inline price edit ── */
function PriceCell({ caseId, initial, onChange }: { caseId: string; initial: number | null; onChange: (p: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(initial ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    const num = parseFloat(val.replace(",", "."));
    if (!isNaN(num)) {
      await fetch(`/api/admin/symulacje/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: num }),
      });
      onChange(num);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input ref={inputRef} type="text" value={val} aria-label="Cena (zł)"
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        onBlur={save}
        className="w-20 rounded border border-primary/40 bg-white dark:bg-[#0B1120] px-1.5 py-0.5 text-xs text-right tabular-nums text-slate-900 dark:text-white focus:outline-none"
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)} aria-label="Edytuj cenę"
      className="group/p flex items-center gap-1 text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors">
      {fmtPrice(initial)}
      <svg className="h-3 w-3 opacity-0 group-hover/p:opacity-100 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

/* ── Main page ── */
export default function AdminPage() {
  const [access, setAccess] = useState<"loading" | "ok" | "denied">("loading");
  const [tab, setTab] = useState<"pulpit" | "analityka" | "symulacje" | "uzytkownicy">("pulpit");
  const [stats, setStats] = useState<Stats | null>(null);
  const [drawerSim, setDrawerSim] = useState<Sim | null>(null);

  // Symulacje tab state
  const [sims, setSims] = useState<Sim[]>([]);
  const [simsTotal, setSimsTotal] = useState(0);
  const [simsPage, setSimsPage] = useState(1);
  const [simsStatus, setSimsStatus] = useState("all");
  const [simsSearch, setSimsSearch] = useState("");
  const [simsLoading, setSimsLoading] = useState(false);

  // Users tab state
  const [users, setUsers] = useState<User[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // Load stats on mount (also serves as auth check)
  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (res.status === 403) { setAccess("denied"); return; }
        const data = await res.json();
        setStats(data);
        setAccess("ok");
      })
      .catch(() => setAccess("denied"));
  }, []);

  // Load simulations
  const loadSims = useCallback(async (page: number, status: string, search: string) => {
    setSimsLoading(true);
    const params = new URLSearchParams({ page: String(page), status, search });
    const res = await fetch(`/api/admin/symulacje?${params}`);
    const data = await res.json();
    setSims(data.data ?? []);
    setSimsTotal(data.total ?? 0);
    setSimsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "symulacje" && access === "ok") loadSims(simsPage, simsStatus, simsSearch);
  }, [tab, simsPage, simsStatus, access, loadSims]);

  const handleSearch = () => { setSimsPage(1); loadSims(1, simsStatus, simsSearch); };

  // Skok z Pulpitu do zakładki Symulacje z ustawionym filtrem statusu
  const jumpToSims = (status: string) => {
    setTab("symulacje");
    setSimsStatus(status);
    setSimsPage(1);
    loadSims(1, status, "");
    setSimsSearch("");
  };

  // Load users
  useEffect(() => {
    if (tab !== "uzytkownicy" || access !== "ok") return;
    setUsersLoading(true);
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(data => { setUsers(data); setUsersLoading(false); })
      .catch(() => setUsersLoading(false));
  }, [tab, access]);

  if (access === "loading") {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Ładowanie panelu">
        <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }
  if (access === "denied") {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Brak dostępu</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ta strona jest dostępna tylko dla administratorów.</p>
        <Link href="/narzedzia" className="mt-4 inline-block text-sm text-primary hover:underline">Wróć do narzędzi</Link>
      </div>
    );
  }

  const c = stats!.counts;
  const filteredUsers = usersSearch
    ? users.filter(u => u.email.toLowerCase().includes(usersSearch.toLowerCase()))
    : users;

  const totalPages = Math.ceil(simsTotal / 50);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Panel administratora</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Zarządzanie symulacjami i użytkownikami</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Admin</span>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Sekcje panelu" className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(["pulpit", "analityka", "symulacje", "uzytkownicy"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}>
            {t === "pulpit" ? "Pulpit" : t === "analityka" ? "Analityka" : t === "symulacje" ? "Symulacje" : "Użytkownicy"}
          </button>
        ))}
      </div>

      {/* ── PULPIT ── */}
      {tab === "pulpit" && (
        <div className="space-y-6">

          {/* Wymaga uwagi */}
          {(c.pending > 0 || c.failed > 0 || c.unpaid > 0) && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.75-2.98l-6.93-12a2 2 0 00-3.5 0l-6.93 12A2 2 0 005.07 19z" />
                </svg>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Wymaga uwagi</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.pending > 0 && (
                  <button onClick={() => jumpToSims("pending")}
                    className="rounded-lg bg-white dark:bg-[#1E232E] border border-amber-200 dark:border-amber-900/40 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-amber-300 transition-colors">
                    {c.pending} oczekujących →
                  </button>
                )}
                {c.failed > 0 && (
                  <button onClick={() => jumpToSims("failed")}
                    className="rounded-lg bg-white dark:bg-[#1E232E] border border-amber-200 dark:border-amber-900/40 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-amber-300 transition-colors">
                    {c.failed} z błędem →
                  </button>
                )}
                {c.unpaid > 0 && (
                  <button onClick={() => jumpToSims("done")}
                    className="rounded-lg bg-white dark:bg-[#1E232E] border border-amber-200 dark:border-amber-900/40 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-amber-300 transition-colors">
                    {c.unpaid.toLocaleString("pl-PL")} zł do zapłaty →
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <Kpi label="Wszystkie" value={c.total} />
            <Kpi label="Oczekujące" value={c.pending} cls="text-amber-600 dark:text-amber-400" />
            <Kpi label="W toku" value={c.running} cls="text-blue-600 dark:text-blue-400" />
            <Kpi label="Zakończone" value={c.done} cls="text-green-600 dark:text-green-400" />
            <Kpi label="Błędy" value={c.failed} cls="text-red-500 dark:text-red-400" />
            <Kpi label="Przychód" value={c.revenue.toLocaleString("pl-PL") + " zł"} cls="text-primary" />
            <Kpi label="Do zapłaty" value={c.unpaid.toLocaleString("pl-PL") + " zł"} cls={c.unpaid > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
            <Kpi label="Użytkownicy" value={c.users} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Ostatnie zlecenia</h2>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    {["Status", "Case ID", "Email", "Plik", "Serwer", "Cena", "Data"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats!.recent.map(r => (
                    <tr key={r.case_id} className="bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta(r.status).cls}`}>
                          {statusMeta(r.status).label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                        <Link href={`/narzedzia/symulacje/${r.case_id}`} className="hover:text-primary transition-colors">{r.case_id}</Link>
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">{r.email}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{r.file_name}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400 uppercase">{r.server_type ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{fmtPrice(r.price)}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALITYKA ── */}
      {tab === "analityka" && <AdminAnalytics />}

      {/* ── SYMULACJE ── */}
      {tab === "symulacje" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1">
              {(["all", "pending", "running", "done", "failed"] as const).map(s => (
                <button key={s} onClick={() => { setSimsStatus(s); setSimsPage(1); loadSims(1, s, simsSearch); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    simsStatus === s
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-[#1E232E] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                  }`}>
                  {s === "all" ? "Wszystkie" : statusMeta(s).label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 ml-auto">
              <input
                type="text"
                placeholder="Szukaj: case_id, email, plik…"
                value={simsSearch}
                onChange={e => setSimsSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#1E232E] px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary w-56"
              />
              <button onClick={handleSearch}
                className="rounded-lg bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors">
                Szukaj
              </button>
              <button onClick={() => exportSimsCsv(sims)} disabled={sims.length === 0}
                title="Eksportuj bieżącą stronę do CSV"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
              </button>
            </div>
          </div>

          {/* Table */}
          {simsLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    {["Status", "Case ID", "Email", "Plik", "Serwer", "Czas", "Cena", "Data"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sims.map(r => (
                    <tr key={r.case_id} className="bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5">
                        <StatusCell caseId={r.case_id} initial={r.status}
                          onChange={(s) => setSims(prev => prev.map(x => x.case_id === r.case_id ? { ...x, status: s } : x))} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <Link href={`/narzedzia/symulacje/${r.case_id}`} className="hover:text-primary transition-colors">{r.case_id}</Link>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">{r.email}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">{r.file_name}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 uppercase font-mono">{r.server_type ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{fmtHours(r.wall_hours)}</td>
                      <td className="px-3 py-2.5">
                        <PriceCell caseId={r.case_id} initial={r.price}
                          onChange={(p) => setSims(prev => prev.map(x => x.case_id === r.case_id ? { ...x, price: p } : x))} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a href={`/api/admin/symulacje/${r.case_id}/download-fds`} download
                            title="Pobierz plik .fds" aria-label={`Pobierz plik .fds zlecenia ${r.case_id}`}
                            className="rounded-md p-1 text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          <button onClick={() => setDrawerSim(r)} title="Szczegóły" aria-label={`Szczegóły zlecenia ${r.case_id}`}
                            className="rounded-md p-1 text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sims.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400">Brak wyników</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {Math.min((simsPage - 1) * 50 + 1, simsTotal)}–{Math.min(simsPage * 50, simsTotal)} z {simsTotal} · strona {simsPage}/{totalPages}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { const p = simsPage - 1; setSimsPage(p); loadSims(p, simsStatus, simsSearch); }}
                  disabled={simsPage <= 1}
                  className="rounded border border-slate-200 dark:border-slate-700 px-3 py-1 disabled:opacity-40 hover:border-slate-300 transition-colors">
                  ← Poprzednia
                </button>
                <button onClick={() => { const p = simsPage + 1; setSimsPage(p); loadSims(p, simsStatus, simsSearch); }}
                  disabled={simsPage >= totalPages}
                  className="rounded border border-slate-200 dark:border-slate-700 px-3 py-1 disabled:opacity-40 hover:border-slate-300 transition-colors">
                  Następna →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UŻYTKOWNICY ── */}
      {tab === "uzytkownicy" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Szukaj po emailu…"
              value={usersSearch}
              onChange={e => setUsersSearch(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#1E232E] px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary w-64"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 self-center">{filteredUsers.length} użytkowników</span>
          </div>

          {usersLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    {["Email", "Zarejestrowany", "Ostatnie logowanie", "Symulacje", "Zakończone", "Przychód"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">{u.email}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(u.created_at)}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{u.last_sign_in_at ? fmtDateTime(u.last_sign_in_at) : "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600 dark:text-slate-300 font-medium">{u.total || "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums text-green-600 dark:text-green-400 font-medium">{u.done || "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums text-primary font-medium">{u.revenue ? fmtPrice(u.revenue) : "—"}</td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">Brak użytkowników</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DRAWER SZCZEGÓŁÓW ── */}
      {drawerSim && (
        <SimDrawer
          sim={drawerSim}
          onClose={() => setDrawerSim(null)}
          onSaved={(patch) => {
            setSims(prev => prev.map(x => x.case_id === drawerSim.case_id ? { ...x, ...patch } : x));
            setDrawerSim(prev => prev ? { ...prev, ...patch } : prev);
          }}
        />
      )}

    </div>
  );
}
