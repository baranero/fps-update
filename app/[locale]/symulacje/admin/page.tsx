"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import AdminAnalytics from "./AdminAnalytics";
import AdminInfra from "./AdminInfra";
import SimDrawer from "./SimDrawer";
import { statusMeta, ADMIN_STATUS_KEYS } from "@/lib/status";
import { fmtDateTime, fmtPrice, fmtHours, fmtEur } from "@/lib/format";
import { EUR_PLN } from "@/lib/fds/parser";
import {
  Btn, Chip, FilterTabs, Kpi, Notice, PageHead, SectionLabel, Shell, Skeleton,
  cardCls, iconBtnCls, inputSmCls, tableCls, tdCls, tdNumCls, thCls, theadRowCls, trCls,
} from "@/components/Cloud/ui";

// Marża wiersza listy = cena klienta − koszt serwera Hetzner (przeliczony na zł).
// UWAGA: bez kosztu magazynu — ten wymaga LIST po buckecie, więc pełne rozliczenie
// (serwer + storage) liczy dopiero szuflada szczegółów.
function rowMarginPln(r: { price: number | null; hetzner_cost_eur?: number | null }): number | null {
  if (r.price == null || r.hetzner_cost_eur == null) return null;
  return r.price - r.hetzner_cost_eur * EUR_PLN;
}

/* ── Types ── */
type Sim = {
  case_id: string; email: string; name: string; file_name: string;
  status: string; created_at: string; completed_at: string | null;
  price: number | null; server_type: string | null; wall_hours: number | null;
  total_cells: number | null;
  hetzner_cost_eur?: number | null; hetzner_runtime_h?: number | null;
};
type User = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  total: number; done: number; revenue: number;
  // Dane do faktury (z profiles) — podgląd dla admina
  full_name: string; company: string; nip: string; phone: string; address: string;
  profile_updated_at: string | null;
};

function hasInvoiceData(u: User): boolean {
  return !!(u.full_name || u.company || u.nip || u.phone || u.address);
}

/* ── Szczegół danych do faktury ── */
function DetailField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="font-mono text-fr-micro uppercase text-faint">{label}</p>
      <p className={`mt-0.5 break-words text-fr-sm ${value ? "text-ink" : "text-faint"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
type Stats = {
  counts: { total: number; pending: number; running: number; done: number; failed: number; revenue: number; unpaid: number; users: number };
  recent: Sim[];
};

/* ── CSV eksport ── */
function exportSimsCsv(rows: Sim[]) {
  const header = ["Case ID", "Email", "Nazwa", "Plik", "Status", "Serwer", "Komorki", "Czas (h)", "Cena (zl)", "Koszt Hetzner (EUR)", "Marza bez storage (zl)", "Utworzono", "Ukonczono"];
  const body = rows.map((r) => [
    r.case_id, r.email, r.name, r.file_name, statusMeta(r.status).label,
    r.server_type ?? "", r.total_cells ?? "", r.wall_hours ?? "",
    r.price != null ? String(r.price).replace(".", ",") : "",
    r.hetzner_cost_eur != null ? r.hetzner_cost_eur.toFixed(2).replace(".", ",") : "",
    (() => { const m = rowMarginPln(r); return m != null ? m.toFixed(2).replace(".", ",") : ""; })(),
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
        className={`${cfg.cls} ${saving ? "opacity-50" : "cursor-pointer"}`}
      >
        {cfg.label}
        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-panel border border-hairline bg-panel shadow-fr-float">
          {ADMIN_STATUS_KEYS.map((key) => (
            <button key={key} role="option" aria-selected={key === current} onClick={() => pick(key)}
              className={`w-full px-3 py-2 text-left text-fr-sm transition-colors hover:bg-panel-deep ${key === current ? "text-primary" : "text-ink"}`}>
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
        className="fr-num w-20 rounded-tile border border-primary/40 bg-canvas px-1.5 py-0.5 text-right font-mono text-fr-sm text-ink outline-none"
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)} aria-label="Edytuj cenę"
      className="group/p fr-num flex items-center gap-1 font-mono text-fr-sm text-ink transition-colors hover:text-primary">
      {fmtPrice(initial)}
      <svg className="h-3 w-3 text-faint opacity-0 group-hover/p:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

/* ── Main page ── */
export default function AdminPage() {
  const [access, setAccess] = useState<"loading" | "ok" | "denied">("loading");
  const [tab, setTab] = useState<"pulpit" | "analityka" | "symulacje" | "uzytkownicy" | "infrastruktura">("pulpit");
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
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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

  // Trwałe usunięcie cudzego zlecenia (serwer + pliki + rekord). Nieodwracalne.
  const deleteSim = useCallback(async (caseId: string) => {
    if (!window.confirm(`Usunąć zlecenie ${caseId}?\n\nOperacja nieodwracalna — skasuje serwer (jeśli aktywny), plik wejściowy i wyniki z magazynu.`)) return;
    const res = await fetch(`/api/admin/symulacje/${caseId}`, { method: "DELETE" });
    if (res.ok) {
      setSims(prev => prev.filter(x => x.case_id !== caseId));
      setSimsTotal(t => Math.max(0, t - 1));
      setDrawerSim(prev => (prev?.case_id === caseId ? null : prev));
    } else {
      window.alert("Nie udało się usunąć zlecenia. Spróbuj ponownie.");
    }
  }, []);

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
      <Shell width="xl">
        <div className="space-y-6" aria-busy="true" aria-label="Ładowanie panelu">
          <Skeleton className="h-14" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Shell>
    );
  }
  if (access === "denied") {
    return (
      <Shell width="xl">
        <div className="py-20 text-center">
          <p className="font-heading text-fr-h3 text-ink">Brak dostępu</p>
          <p className="mt-1 text-fr-sm text-muted">Ta strona jest dostępna tylko dla administratorów.</p>
          <Link
            href="/symulacje"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-fr-label uppercase text-primary transition-opacity hover:opacity-80"
          >
            Wróć do pulpitu <span aria-hidden>→</span>
          </Link>
        </div>
      </Shell>
    );
  }

  const c = stats!.counts;
  const filteredUsers = usersSearch
    ? users.filter(u => {
        const q = usersSearch.toLowerCase();
        return u.email.toLowerCase().includes(q)
          || u.full_name.toLowerCase().includes(q)
          || u.company.toLowerCase().includes(q)
          || u.nip.toLowerCase().includes(q);
      })
    : users;

  const totalPages = Math.ceil(simsTotal / 50);

  const SECTIONS = [
    { id: "pulpit", label: "Pulpit" },
    { id: "analityka", label: "Analityka" },
    { id: "symulacje", label: "Symulacje" },
    { id: "uzytkownicy", label: "Użytkownicy" },
    { id: "infrastruktura", label: "Infrastruktura" },
  ] as const;

  return (
    <Shell width="xl">
      <div className="space-y-6">

      {/* Header */}
      <PageHead
        kicker="FDSRUN // ADMIN"
        title="Panel administratora"
        lead="Zarządzanie symulacjami i użytkownikami"
        badge={<Chip tone="primary" dot>Admin</Chip>}
        back={{ href: "/symulacje", label: "Pulpit" }}
      />

      {/* Tabs */}
      <FilterTabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={tab}
        onPick={(id) => setTab(id)}
        label="Sekcje panelu"
      />

      {/* ── PULPIT ── */}
      {tab === "pulpit" && (
        <div className="space-y-6">

          {/* Wymaga uwagi */}
          {(c.pending > 0 || c.failed > 0 || c.unpaid > 0) && (
            <Notice tone="warn" title="Wymaga uwagi">
              <div className="mt-2 flex flex-wrap gap-2">
                {c.pending > 0 && (
                  <Btn variant="secondary" size="sm" onClick={() => jumpToSims("pending")}>
                    {c.pending} oczekujących <span aria-hidden>→</span>
                  </Btn>
                )}
                {c.failed > 0 && (
                  <Btn variant="secondary" size="sm" onClick={() => jumpToSims("failed")}>
                    {c.failed} z błędem <span aria-hidden>→</span>
                  </Btn>
                )}
                {c.unpaid > 0 && (
                  <Btn variant="secondary" size="sm" onClick={() => jumpToSims("done")}>
                    {fmtPrice(c.unpaid)} do zapłaty <span aria-hidden>→</span>
                  </Btn>
                )}
              </div>
            </Notice>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <Kpi label="Wszystkie" value={c.total} />
            <Kpi label="Oczekujące" value={c.pending} tone="warn" />
            <Kpi label="W toku" value={c.running} tone="signal" />
            <Kpi label="Zakończone" value={c.done} tone="ok" />
            <Kpi label="Błędy" value={c.failed} tone="primary" />
            <Kpi label="Przychód" value={fmtPrice(c.revenue)} tone="primary" />
            <Kpi label="Do zapłaty" value={fmtPrice(c.unpaid)} tone={c.unpaid > 0 ? "warn" : "ink"} />
            <Kpi label="Użytkownicy" value={c.users} />
          </div>

          <div>
            <SectionLabel className="mb-3 block">Ostatnie zlecenia</SectionLabel>
            <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
              <table className={`${tableCls} min-w-[720px]`}>
                <thead>
                  <tr className={theadRowCls}>
                    {["Status", "Case ID", "Email", "Plik", "Serwer", "Cena", "Data"].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {stats!.recent.map(r => (
                    <tr key={r.case_id} className={trCls}>
                      <td className="px-3 py-2">
                        <span className={statusMeta(r.status).cls}>{statusMeta(r.status).label}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted">
                        <Link href={`/symulacje/${r.case_id}`} className="transition-colors hover:text-primary">{r.case_id}</Link>
                      </td>
                      <td className={`${tdCls} max-w-[140px] truncate`}>{r.email}</td>
                      <td className={`${tdCls} max-w-[120px] truncate`}>{r.file_name}</td>
                      <td className={`${tdCls} font-mono uppercase`}>{r.server_type ?? "—"}</td>
                      <td className={`${tdNumCls} text-ink`}>{fmtPrice(r.price)}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>{fmtDateTime(r.created_at)}</td>
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

      {/* ── INFRASTRUKTURA (Hetzner: serwery + storage, koszty) ── */}
      {tab === "infrastruktura" && <AdminInfra />}

      {/* ── SYMULACJE ── */}
      {tab === "symulacje" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs
              tabs={(["all", "pending", "running", "done", "failed"] as const).map((s) => ({
                id: s,
                label: s === "all" ? "Wszystkie" : statusMeta(s).label,
              }))}
              active={simsStatus}
              onPick={(s) => { setSimsStatus(s); setSimsPage(1); loadSims(1, s, simsSearch); }}
              label="Filtr statusu"
            />
            <div className="ml-auto flex gap-2">
              <input
                type="text"
                placeholder="Szukaj: case_id, email, plik…"
                value={simsSearch}
                onChange={e => setSimsSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                className={`${inputSmCls} w-56`}
              />
              <Btn size="sm" onClick={handleSearch}>Szukaj</Btn>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => exportSimsCsv(sims)}
                disabled={sims.length === 0}
                title="Eksportuj bieżącą stronę do CSV"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
              </Btn>
            </div>
          </div>

          {/* Table */}
          {simsLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-panel" />)}
            </div>
          ) : (
            <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
              <table className={`${tableCls} min-w-[1000px]`}>
                <thead>
                  <tr className={theadRowCls}>
                    {["Status", "Case ID", "Email", "Plik", "Serwer", "Czas", "Cena", "Koszt HZ", "Marża", "Data"].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {sims.map(r => (
                    <tr key={r.case_id} className={trCls}>
                      <td className="px-3 py-2.5">
                        <StatusCell caseId={r.case_id} initial={r.status}
                          onChange={(s) => setSims(prev => prev.map(x => x.case_id === r.case_id ? { ...x, status: s } : x))} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted">
                        <Link href={`/symulacje/${r.case_id}`} className="transition-colors hover:text-primary">{r.case_id}</Link>
                      </td>
                      <td className={`${tdCls} max-w-[160px] truncate`}>{r.email}</td>
                      <td className={`${tdCls} max-w-[140px] truncate`}>{r.file_name}</td>
                      <td className={`${tdCls} font-mono uppercase`}>{r.server_type ?? "—"}</td>
                      <td className={tdNumCls}>{fmtHours(r.wall_hours)}</td>
                      <td className="px-3 py-2.5">
                        <PriceCell caseId={r.case_id} initial={r.price}
                          onChange={(p) => setSims(prev => prev.map(x => x.case_id === r.case_id ? { ...x, price: p } : x))} />
                      </td>
                      <td className={tdNumCls} title={r.hetzner_runtime_h != null ? `Czas życia serwera: ${fmtHours(r.hetzner_runtime_h)}` : undefined}>
                        {fmtEur(r.hetzner_cost_eur)}
                      </td>
                      {(() => {
                        const m = rowMarginPln(r);
                        return (
                          <td
                            className={`${tdNumCls} ${m == null ? "text-faint" : m >= 0 ? "text-ok" : "text-primary"}`}
                            title="Cena klienta − koszt serwera Hetzner (bez magazynu). Pełne rozliczenie w szczegółach zlecenia."
                          >
                            {m != null ? fmtPrice(m, { decimals: true }) : "—"}
                          </td>
                        );
                      })()}
                      <td className={`${tdCls} whitespace-nowrap`}>{fmtDateTime(r.created_at)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a href={`/api/admin/symulacje/${r.case_id}/download-fds`} download
                            title="Pobierz plik .fds" aria-label={`Pobierz plik .fds zlecenia ${r.case_id}`}
                            className={iconBtnCls()}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          <button onClick={() => setDrawerSim(r)} title="Szczegóły" aria-label={`Szczegóły zlecenia ${r.case_id}`}
                            className={iconBtnCls()}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteSim(r.case_id)} title="Usuń zlecenie" aria-label={`Usuń zlecenie ${r.case_id}`}
                            className={iconBtnCls(true)}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sims.length === 0 && (
                    <tr><td colSpan={11} className="px-3 py-10 text-center text-muted">Brak wyników</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-hairline-soft pt-4 font-mono text-fr-micro uppercase text-muted">
              <span className="fr-num">
                {Math.min((simsPage - 1) * 50 + 1, simsTotal)}–{Math.min(simsPage * 50, simsTotal)} z {simsTotal} · strona {simsPage}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Btn variant="secondary" size="sm"
                  onClick={() => { const p = simsPage - 1; setSimsPage(p); loadSims(p, simsStatus, simsSearch); }}
                  disabled={simsPage <= 1}>
                  <span aria-hidden>←</span> Poprzednia
                </Btn>
                <Btn variant="secondary" size="sm"
                  onClick={() => { const p = simsPage + 1; setSimsPage(p); loadSims(p, simsStatus, simsSearch); }}
                  disabled={simsPage >= totalPages}>
                  Następna <span aria-hidden>→</span>
                </Btn>
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
              placeholder="Szukaj: email, nazwa, firma, NIP…"
              value={usersSearch}
              onChange={e => setUsersSearch(e.target.value)}
              className={`${inputSmCls} w-72`}
            />
            <span className="fr-num self-center font-mono text-fr-micro uppercase text-muted">{filteredUsers.length} użytkowników</span>
          </div>

          {usersLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-panel" />)}
            </div>
          ) : (
            <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
              <table className={`${tableCls} min-w-[860px]`}>
                <thead>
                  <tr className={theadRowCls}>
                    {["Email", "Klient / firma", "Zarejestrowany", "Ostatnie logowanie", "Symulacje", "Zakończone", "Przychód"].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {filteredUsers.map(u => {
                    const open = expandedUser === u.id;
                    return (
                      <Fragment key={u.id}>
                        <tr
                          onClick={() => setExpandedUser(open ? null : u.id)}
                          title="Pokaż / ukryj dane do faktury"
                          className={`cursor-pointer ${trCls}`}
                        >
                          <td className="px-3 py-2.5 font-mono text-fr-sm text-ink">{u.email}</td>
                          <td className="px-3 py-2.5">
                            {u.full_name
                              ? <span className="text-ink">{u.full_name}</span>
                              : <span className="text-faint">—</span>}
                            {u.company && <div className="max-w-[180px] truncate text-fr-sm text-faint">{u.company}</div>}
                          </td>
                          <td className={`${tdCls} whitespace-nowrap`}>{fmtDateTime(u.created_at)}</td>
                          <td className={`${tdCls} whitespace-nowrap`}>{u.last_sign_in_at ? fmtDateTime(u.last_sign_in_at) : "—"}</td>
                          <td className={tdNumCls}>{u.total || "—"}</td>
                          <td className={`${tdNumCls} text-ok`}>{u.done || "—"}</td>
                          <td className={`${tdNumCls} text-primary`}>{u.revenue ? fmtPrice(u.revenue) : "—"}</td>
                          <td className="px-3 py-2.5 text-right">
                            <svg className={`inline h-4 w-4 text-faint transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-panel-deep">
                            <td colSpan={8} className="px-4 py-4">
                              {hasInvoiceData(u) ? (
                                <>
                                  <p className="mb-3 font-mono text-fr-micro uppercase text-muted">Dane do faktury</p>
                                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <DetailField label="Imię i nazwisko" value={u.full_name} />
                                    <DetailField label="Firma" value={u.company} />
                                    <DetailField label="NIP" value={u.nip} />
                                    <DetailField label="Telefon" value={u.phone} />
                                    <DetailField label="Adres" value={u.address} wide />
                                    <DetailField label="Zaktualizowano" value={u.profile_updated_at ? fmtDateTime(u.profile_updated_at) : ""} />
                                  </div>
                                </>
                              ) : (
                                <p className="text-fr-sm text-faint">Ten użytkownik nie uzupełnił jeszcze danych do faktury.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-faint">Brak użytkowników</td></tr>
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
          onDeleted={(caseId) => {
            setSims(prev => prev.filter(x => x.case_id !== caseId));
            setSimsTotal(t => Math.max(0, t - 1));
          }}
        />
      )}

      </div>
    </Shell>
  );
}
