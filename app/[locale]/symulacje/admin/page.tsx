"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AdminAnalytics from "./AdminAnalytics";
import AdminCalibration from "./AdminCalibration";
import AdminInfra from "./AdminInfra";
import SimDrawer from "./SimDrawer";
import { statusMeta, ADMIN_STATUS_KEYS } from "@/lib/status";
import { useFormat } from "@/lib/format";
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
// `t` i `ts` wstrzykiwane z komponentu: eksport nagłówków i statusów idzie w
// języku panelu, a separator dziesiętny zostaje przecinkiem (Excel PL).
function exportSimsCsv(
  rows: Sim[],
  t: (k: string) => string,
  ts: (k: string) => string,
  locale: string
) {
  const header = [
    t("csv.caseId"), t("csv.email"), t("csv.name"), t("csv.file"), t("csv.status"),
    t("csv.server"), t("csv.cells"), t("csv.hours"), t("csv.price"),
    t("csv.hetznerCost"), t("csv.margin"), t("csv.created"), t("csv.completed"),
  ];
  const intlLocale = locale === "en" ? "en-GB" : "pl-PL";
  const body = rows.map((r) => [
    r.case_id, r.email, r.name, r.file_name, ts(statusMeta(r.status).key),
    r.server_type ?? "", r.total_cells ?? "", r.wall_hours ?? "",
    r.price != null ? String(r.price).replace(".", ",") : "",
    r.hetzner_cost_eur != null ? r.hetzner_cost_eur.toFixed(2).replace(".", ",") : "",
    (() => { const m = rowMarginPln(r); return m != null ? m.toFixed(2).replace(".", ",") : ""; })(),
    new Date(r.created_at).toLocaleString(intlLocale),
    r.completed_at ? new Date(r.completed_at).toLocaleString(intlLocale) : "",
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
  const t = useTranslations("admin");
  const ts = useTranslations("status");
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
        aria-label={t("statusChange", { status: ts(cfg.key) })}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${cfg.cls} ${saving ? "opacity-50" : "cursor-pointer"}`}
      >
        {ts(cfg.key)}
        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-panel border border-hairline bg-panel shadow-fr-float">
          {ADMIN_STATUS_KEYS.map((key) => (
            <button key={key} role="option" aria-selected={key === current} onClick={() => pick(key)}
              className={`w-full px-3 py-2 text-left text-fr-sm transition-colors hover:bg-panel-deep ${key === current ? "text-primary" : "text-ink"}`}>
              {ts(statusMeta(key).key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Inline price edit ── */
function PriceCell({ caseId, initial, onChange }: { caseId: string; initial: number | null; onChange: (p: number) => void }) {
  const t = useTranslations("admin");
  const f = useFormat();
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
      <input ref={inputRef} type="text" value={val} aria-label={t("priceLabel")}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        onBlur={save}
        className="fr-num w-20 rounded-tile border border-primary/40 bg-canvas px-1.5 py-0.5 text-right font-mono text-fr-sm text-ink outline-none"
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)} aria-label={t("priceEdit")}
      className="group/p fr-num flex items-center gap-1 font-mono text-fr-sm text-ink transition-colors hover:text-primary">
      {f.fmtPrice(initial)}
      <svg className="h-3 w-3 text-faint opacity-0 group-hover/p:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

/* ── Main page ── */
export default function AdminPage() {
  const t = useTranslations("admin");
  const ts = useTranslations("status");
  const f = useFormat();
  const [access, setAccess] = useState<"loading" | "ok" | "denied">("loading");
  const [tab, setTab] = useState<"pulpit" | "analityka" | "symulacje" | "uzytkownicy" | "infrastruktura" | "kalibracja">("pulpit");
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
    if (!window.confirm(t("deleteConfirm", { caseId }))) return;
    const res = await fetch(`/api/admin/symulacje/${caseId}`, { method: "DELETE" });
    if (res.ok) {
      setSims(prev => prev.filter(x => x.case_id !== caseId));
      setSimsTotal(t => Math.max(0, t - 1));
      setDrawerSim(prev => (prev?.case_id === caseId ? null : prev));
    } else {
      window.alert(t("deleteFailed"));
    }
  }, [t]);

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
        <div className="space-y-6" aria-busy="true" aria-label={t("loading")}>
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
          <p className="font-heading text-fr-h3 text-ink">{t("noAccessTitle")}</p>
          <p className="mt-1 text-fr-sm text-muted">{t("noAccessText")}</p>
          <Link
            href="/symulacje"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-fr-label uppercase text-primary transition-opacity hover:opacity-80"
          >
            {t("backToDashboard")} <span aria-hidden>→</span>
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
    { id: "pulpit", label: t("sections.dashboard") },
    { id: "analityka", label: t("sections.analytics") },
    { id: "symulacje", label: t("sections.sims") },
    { id: "uzytkownicy", label: t("sections.users") },
    { id: "infrastruktura", label: t("sections.infra") },
    { id: "kalibracja", label: t("sections.calibration") },
  ] as const;

  return (
    <Shell width="xl">
      <div className="space-y-6">

      {/* Header */}
      <PageHead
        kicker="FDSRUN // ADMIN"
        title={t("title")}
        lead={t("lead")}
        badge={<Chip tone="primary" dot>{t("badge")}</Chip>}
        back={{ href: "/symulacje", label: t("backLabel") }}
      />

      {/* Tabs */}
      <FilterTabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={tab}
        onPick={(id) => setTab(id)}
        label={t("sections.label")}
      />

      {/* ── PULPIT ── */}
      {tab === "pulpit" && (
        <div className="space-y-6">

          {/* Wymaga uwagi */}
          {(c.pending > 0 || c.failed > 0 || c.unpaid > 0) && (
            <Notice tone="warn" title={t("attention.title")}>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.pending > 0 && (
                  <Btn variant="secondary" size="sm" onClick={() => jumpToSims("pending")}>
                    {t("attention.pending", { n: c.pending })} <span aria-hidden>→</span>
                  </Btn>
                )}
                {c.failed > 0 && (
                  <Btn variant="secondary" size="sm" onClick={() => jumpToSims("failed")}>
                    {t("attention.failed", { n: c.failed })} <span aria-hidden>→</span>
                  </Btn>
                )}
                {c.unpaid > 0 && (
                  <Btn variant="secondary" size="sm" onClick={() => jumpToSims("done")}>
                    {t("attention.unpaid", { amount: f.fmtPrice(c.unpaid) })} <span aria-hidden>→</span>
                  </Btn>
                )}
              </div>
            </Notice>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <Kpi label={t("kpi.all")} value={c.total} />
            <Kpi label={t("kpi.pending")} value={c.pending} tone="warn" />
            <Kpi label={t("kpi.running")} value={c.running} tone="signal" />
            <Kpi label={t("kpi.done")} value={c.done} tone="ok" />
            <Kpi label={t("kpi.failed")} value={c.failed} tone="primary" />
            <Kpi label={t("kpi.revenue")} value={f.fmtPrice(c.revenue)} tone="primary" />
            <Kpi label={t("kpi.unpaid")} value={f.fmtPrice(c.unpaid)} tone={c.unpaid > 0 ? "warn" : "ink"} />
            <Kpi label={t("kpi.users")} value={c.users} />
          </div>

          <div>
            <SectionLabel className="mb-3 block">{t("recent")}</SectionLabel>
            <div className={`${cardCls} overflow-hidden overflow-x-auto`}>
              <table className={`${tableCls} min-w-[720px]`}>
                <thead>
                  <tr className={theadRowCls}>
                    {[t("cols.status"), t("cols.caseId"), t("cols.email"), t("cols.file"), t("cols.server"), t("cols.price"), t("cols.date")].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {stats!.recent.map(r => (
                    <tr key={r.case_id} className={trCls}>
                      <td className="px-3 py-2">
                        <span className={statusMeta(r.status).cls}>{ts(statusMeta(r.status).key)}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted">
                        <Link href={`/symulacje/${r.case_id}`} className="transition-colors hover:text-primary">{r.case_id}</Link>
                      </td>
                      <td className={`${tdCls} max-w-[140px] truncate`}>{r.email}</td>
                      <td className={`${tdCls} max-w-[120px] truncate`}>{r.file_name}</td>
                      <td className={`${tdCls} font-mono uppercase`}>{r.server_type ?? "—"}</td>
                      <td className={`${tdNumCls} text-ink`}>{f.fmtPrice(r.price)}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>{f.fmtDateTime(r.created_at)}</td>
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

      {tab === "kalibracja" && <AdminCalibration />}

      {/* ── SYMULACJE ── */}
      {tab === "symulacje" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs
              tabs={(["all", "pending", "running", "done", "failed"] as const).map((s) => ({
                id: s,
                label: s === "all" ? ts("all") : ts(statusMeta(s).key),
              }))}
              active={simsStatus}
              onPick={(s) => { setSimsStatus(s); setSimsPage(1); loadSims(1, s, simsSearch); }}
              label={t("filterStatus")}
            />
            <div className="ml-auto flex gap-2">
              <input
                type="text"
                placeholder={t("searchSims")}
                value={simsSearch}
                onChange={e => setSimsSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                className={`${inputSmCls} w-56`}
              />
              <Btn size="sm" onClick={handleSearch}>{t("search")}</Btn>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => exportSimsCsv(sims, t, ts, f.locale)}
                disabled={sims.length === 0}
                title={t("csvTitle")}
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
                    {[t("cols.status"), t("cols.caseId"), t("cols.email"), t("cols.file"), t("cols.server"), t("cols.time"), t("cols.price"), t("cols.costHz"), t("cols.margin"), t("cols.date")].map(h => (
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
                      <td className={tdNumCls}>{f.fmtHours(r.wall_hours)}</td>
                      <td className="px-3 py-2.5">
                        <PriceCell caseId={r.case_id} initial={r.price}
                          onChange={(p) => setSims(prev => prev.map(x => x.case_id === r.case_id ? { ...x, price: p } : x))} />
                      </td>
                      <td className={tdNumCls} title={r.hetzner_runtime_h != null ? t("serverLifetime", { time: f.fmtHours(r.hetzner_runtime_h) }) : undefined}>
                        {f.fmtEur(r.hetzner_cost_eur)}
                      </td>
                      {(() => {
                        const m = rowMarginPln(r);
                        return (
                          <td
                            className={`${tdNumCls} ${m == null ? "text-faint" : m >= 0 ? "text-ok" : "text-primary"}`}
                            title={t("marginTitle")}
                          >
                            {m != null ? f.fmtPrice(m, { decimals: true }) : "—"}
                          </td>
                        );
                      })()}
                      <td className={`${tdCls} whitespace-nowrap`}>{f.fmtDateTime(r.created_at)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a href={`/api/admin/symulacje/${r.case_id}/download-fds`} download
                            title={t("downloadFds")} aria-label={t("downloadFdsAria", { caseId: r.case_id })}
                            className={iconBtnCls()}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          <button onClick={() => setDrawerSim(r)} title={t("details")} aria-label={t("detailsAria", { caseId: r.case_id })}
                            className={iconBtnCls()}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteSim(r.case_id)} title={t("delete")} aria-label={t("deleteAria", { caseId: r.case_id })}
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
                    <tr><td colSpan={11} className="px-3 py-10 text-center text-muted">{t("noResults")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-hairline-soft pt-4 font-mono text-fr-micro uppercase text-muted">
              <span className="fr-num">
                {t("pagination", {
                  from: Math.min((simsPage - 1) * 50 + 1, simsTotal),
                  to: Math.min(simsPage * 50, simsTotal),
                  total: simsTotal,
                  page: simsPage,
                  pages: totalPages,
                })}
              </span>
              <div className="flex gap-2">
                <Btn variant="secondary" size="sm"
                  onClick={() => { const p = simsPage - 1; setSimsPage(p); loadSims(p, simsStatus, simsSearch); }}
                  disabled={simsPage <= 1}>
                  <span aria-hidden>←</span> {t("prev")}
                </Btn>
                <Btn variant="secondary" size="sm"
                  onClick={() => { const p = simsPage + 1; setSimsPage(p); loadSims(p, simsStatus, simsSearch); }}
                  disabled={simsPage >= totalPages}>
                  {t("next")} <span aria-hidden>→</span>
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
              placeholder={t("searchUsers")}
              value={usersSearch}
              onChange={e => setUsersSearch(e.target.value)}
              className={`${inputSmCls} w-72`}
            />
            <span className="fr-num self-center font-mono text-fr-micro uppercase text-muted">{t("usersCount", { n: filteredUsers.length })}</span>
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
                    {[t("cols.email"), t("cols.client"), t("cols.registered"), t("cols.lastSignIn"), t("cols.sims"), t("cols.done"), t("cols.revenue")].map(h => (
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
                          title={t("toggleInvoice")}
                          className={`cursor-pointer ${trCls}`}
                        >
                          <td className="px-3 py-2.5 font-mono text-fr-sm text-ink">{u.email}</td>
                          <td className="px-3 py-2.5">
                            {u.full_name
                              ? <span className="text-ink">{u.full_name}</span>
                              : <span className="text-faint">—</span>}
                            {u.company && <div className="max-w-[180px] truncate text-fr-sm text-faint">{u.company}</div>}
                          </td>
                          <td className={`${tdCls} whitespace-nowrap`}>{f.fmtDateTime(u.created_at)}</td>
                          <td className={`${tdCls} whitespace-nowrap`}>{u.last_sign_in_at ? f.fmtDateTime(u.last_sign_in_at) : "—"}</td>
                          <td className={tdNumCls}>{u.total || "—"}</td>
                          <td className={`${tdNumCls} text-ok`}>{u.done || "—"}</td>
                          <td className={`${tdNumCls} text-primary`}>{u.revenue ? f.fmtPrice(u.revenue) : "—"}</td>
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
                                  <p className="mb-3 font-mono text-fr-micro uppercase text-muted">{t("invoiceData")}</p>
                                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <DetailField label={t("invoice.fullName")} value={u.full_name} />
                                    <DetailField label={t("invoice.company")} value={u.company} />
                                    <DetailField label={t("invoice.nip")} value={u.nip} />
                                    <DetailField label={t("invoice.phone")} value={u.phone} />
                                    <DetailField label={t("invoice.address")} value={u.address} wide />
                                    <DetailField label={t("invoice.updated")} value={u.profile_updated_at ? f.fmtDateTime(u.profile_updated_at) : ""} />
                                  </div>
                                </>
                              ) : (
                                <p className="text-fr-sm text-faint">{t("noInvoiceData")}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-faint">{t("noUsers")}</td></tr>
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
