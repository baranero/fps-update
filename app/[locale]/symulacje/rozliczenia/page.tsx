"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { statusMeta, ACTIVE_STATUSES } from "@/lib/status";
import { useTranslations } from "next-intl";
import { useFormat, type Format } from "@/lib/format";
import InvoiceDataForm from "@/components/InvoiceDataForm";
import {
  Btn, Chip, EmptyState, FilterTabs, Kpi, PageHead, Shell, Skeleton, cardCls,
} from "@/components/Cloud/ui";

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
  payment_status: "paid" | "pending" | null;
};

type FilterTab = "all" | "done" | "active" | "failed" | "cancelled";

function exportCsv(
  items: Item[],
  t: (k: string) => string,
  ts: (k: string) => string,
  f: Format
) {
  const header = [t("csv.caseId"), t("csv.file"), t("csv.date"), t("csv.status"), t("csv.server"), t("csv.cells"), t("csv.time"), t("csv.amount")];
  const rows = items.map((s) => [
    s.case_id,
    s.file_name,
    f.fmtDate(s.created_at, { day: "numeric", month: "numeric", year: "numeric" }),
    ts(statusMeta(s.status).key),
    s.server_type ?? "—",
    f.fmtCells(s.total_cells),
    s.wall_hours > 0 ? f.fmtHours(s.wall_hours) : "—",
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
function groupByMonth(items: Item[], locale: string): Array<{ label: string; items: Item[] }> {
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
      .toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL", { month: "long", year: "numeric" });
    return { label: label.charAt(0).toUpperCase() + label.slice(1), items };
  });
}

export default function RozliczeniaPage() {
  const t = useTranslations("billing");
  const ts = useTranslations("status");
  const f = useFormat();
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
    if (filter === "done")      return s.status === "done";
    if (filter === "active")    return ACTIVE_STATUSES.has(s.status);
    if (filter === "failed")    return s.status === "failed" || s.status === "error";
    if (filter === "cancelled") return s.status === "cancelled";
    return true;
  });

  const totalDone = items.filter((s) => s.status === "done").reduce((sum, s) => sum + s.price, 0);
  const countDone = items.filter((s) => s.status === "done").length;
  const countActive = items.filter((s) => ACTIVE_STATUSES.has(s.status)).length;
  const filteredTotal = filtered.reduce((sum, s) => sum + s.price, 0);

  const groups = groupByMonth(filtered, f.locale);

  const countCancelled = items.filter((s) => s.status === "cancelled").length;

  const TABS: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: "all",       label: ts("all"),       count: items.length },
    { id: "done",      label: ts("done"),      count: countDone },
    { id: "active",    label: ts("running"),   count: countActive },
    { id: "failed",    label: ts("failed"),    count: items.filter((s) => s.status === "failed" || s.status === "error").length },
    { id: "cancelled", label: ts("cancelled"), count: countCancelled },
  ].filter((t) => t.id === "all" || t.id === "done" || t.count > 0) as Array<{ id: FilterTab; label: string; count: number }>;

  return (
    <Shell>
    <div className="space-y-8">

      {/* Header */}
      <PageHead
        kicker={t("kicker")}
        title={t("title")}
        lead={t("lead")}
        back={{ href: "/symulacje", label: t("back") }}
        actions={
          filtered.length > 0 && (
            <Btn variant="secondary" size="sm" onClick={() => exportCsv(filtered, t, ts, f)}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("exportCsv")}
            </Btn>
          )
        }
      />

      {/* Dane do faktury — zunifikowane dane rozliczeniowe (wspólne z Profilem) */}
      {loggedIn && (
        <details id="dane-do-faktury" className="group scroll-mt-24 overflow-hidden rounded-card border border-hairline bg-panel">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile border border-primary/20 bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-heading text-fr-h4 text-ink">{t("invoiceData")}</p>
                <p className="text-fr-sm text-muted">{t("invoiceDataLead")}</p>
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="border-t border-hairline-soft px-5 py-5">
            <InvoiceDataForm variant="panel" />
          </div>
        </details>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : loggedIn === false ? (
        <EmptyState
          text={t("signInPrompt")}
          cta={{ href: "/signin", label: t("signIn") }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          text={t("noJobs")}
          cta={{ href: "/symulacje/nowa", label: t("firstJob") }}
        />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label={t("kpiTotal")} value={f.fmtPrice(totalDone, { decimals: true })} sub={t("net")} />
            <Kpi
              label={t("kpiDone")}
              value={countDone}
              sub={t("jobsCount", { n: countDone })}
            />
            <Kpi
              label={t("kpiActive")}
              value={countActive}
              tone={countActive > 0 ? "warn" : "ink"}
              sub={countActive > 0 ? t("active") : t("noActive")}
            />
          </div>

          {/* Filter tabs */}
          <FilterTabs tabs={TABS} active={filter} onPick={(id) => setFilter(id)} label={t("filterLabel")} />

          {/* Grouped table */}
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-fr-sm text-muted">{t("noneForFilter")}</p>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.label}>
                  {/* Month header */}
                  <div className="mb-2 flex items-center justify-between font-mono text-fr-micro uppercase text-faint">
                    <p>{group.label}</p>
                    <p className="fr-num">
                      {f.fmtPrice(group.items.reduce((s, i) => s + i.price, 0), { decimals: true })}
                    </p>
                  </div>

                  {/* Rows */}
                  <div className={`${cardCls} overflow-hidden`}>
                    <div className="divide-y divide-hairline-soft">
                      {group.items.map((s) => {
                        const st = statusMeta(s.status);
                        return (
                          <div key={s.case_id} className="group flex items-center gap-4 bg-panel px-4 py-3.5 transition-colors hover:bg-panel-deep">

                            {/* Status badge */}
                            <span className={st.cls}>{ts(st.key)}</span>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-fr-body font-medium text-ink">
                                {s.file_name}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-fr-sm text-muted">
                                <span>{s.case_id}</span>
                                {s.server_type && <span className="uppercase">{s.server_type}</span>}
                                <span>{t("cells", { n: f.fmtCells(s.total_cells) })}</span>
                                {s.wall_hours > 0 && <span>{f.fmtHours(s.wall_hours)}</span>}
                              </div>
                            </div>

                            {/* Date */}
                            <div className="hidden shrink-0 text-right font-mono text-fr-sm sm:block">
                              <p className="text-muted">
                                {f.fmtDate(s.created_at, { day: "numeric", month: "short" })}
                              </p>
                              {s.completed_at && (
                                <p className="mt-0.5 text-faint">
                                  {t("completedOn", { date: f.fmtDate(s.completed_at, { day: "numeric", month: "short" }) })}
                                </p>
                              )}
                            </div>

                            {/* Price + payment badge */}
                            <div className="shrink-0 text-right">
                              <p className={`fr-num font-mono text-fr-sm ${s.price > 0 ? "text-ink" : "text-muted"}`}>
                                {s.price > 0 ? f.fmtPrice(s.price, { decimals: true }) : "—"}
                              </p>
                              {s.status === "done" && (
                                <Chip tone={s.payment_status === "paid" ? "ok" : "warn"} className="mt-1">
                                  {s.payment_status === "paid" ? t("paid") : t("unpaid")}
                                </Chip>
                              )}
                            </div>

                            {/* Link */}
                            <Link
                              href={`/symulacje/${s.case_id}`}
                              className="shrink-0 text-faint transition-colors group-hover:text-primary"
                              title={t("openJob")}
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
              <div className="flex items-center justify-between rounded-card border border-hairline bg-panel-deep px-4 py-3.5">
                <p className="font-mono text-fr-micro uppercase text-muted">
                  {t("sum", { filter: (filter === "all" ? ts("all") : TABS.find((tab) => tab.id === filter)?.label ?? "").toLowerCase() })}
                </p>
                <p className="fr-num font-heading text-fr-h4 text-ink">
                  {f.fmtPrice(filteredTotal, { decimals: true })}
                  <span className="ml-1.5 font-mono text-fr-sm font-normal text-muted">{t("net")}</span>
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </Shell>
  );
}
