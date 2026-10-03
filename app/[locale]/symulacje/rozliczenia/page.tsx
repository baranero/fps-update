"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { statusMeta, ACTIVE_STATUSES } from "@/lib/status";
import { useTranslations } from "next-intl";
import { useFormat, type Format } from "@/lib/format";
import InvoiceDataForm from "@/components/InvoiceDataForm";
import { EMPTY_INVOICE, isInvoiceComplete, vatTreatment, type InvoiceData } from "@/lib/invoice";
import { loadInvoiceData } from "@/lib/invoiceClient";
import {
  Btn, Chip, EmptyState, FilterTabs, Kpi, Notice, PageHead, Shell, Skeleton, btnCls, cardCls,
  PageStack,
} from "@/components/Cloud/ui";

type Item = {
  case_id: string;
  file_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  price: number;
  wall_hours: number;
  server_label: string | null;
  total_cells: number;
  mesh_count: number | null;
  payment_status: "paid" | "pending" | null;
};

type FilterTab = "all" | "done" | "active" | "failed" | "cancelled";

function exportCsv(
  items: Item[],
  t: (k: string) => string,
  ts: (k: string) => string,
  f: Format,
  vatRate: number
) {
  // Eksport idzie prosto do księgowości, więc obok netto muszą być stawka VAT
  // i brutto — inaczej każdą pozycję trzeba przeliczać ręcznie.
  const header = [
    t("csv.caseId"), t("csv.file"), t("csv.date"), t("csv.status"), t("csv.server"),
    t("csv.cells"), t("csv.time"), t("csv.amount"), t("csv.vatRate"), t("csv.gross"),
  ];
  const money = (v: number) => v.toFixed(2).replace(".", ",");
  const rows = items.map((s) => [
    s.case_id,
    s.file_name,
    f.fmtDate(s.created_at, { day: "numeric", month: "numeric", year: "numeric" }),
    ts(statusMeta(s.status).key),
    s.server_label ?? "—",
    f.fmtCells(s.total_cells),
    s.wall_hours > 0 ? f.fmtHours(s.wall_hours) : "—",
    money(s.price),
    `${Math.round(vatRate * 100)}%`,
    money(Math.round(s.price * (1 + vatRate) * 100) / 100),
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
  // Stawka VAT i kompletność danych zależą od tego, kim jest nabywca —
  // czytamy je z tego samego źródła, co formularz niżej na stronie.
  const [invoice, setInvoice] = useState<InvoiceData>(EMPTY_INVOICE);
  // Rozliczenia to miejsce, do którego idzie się zapłacić. Do tej pory dało się
  // tu wyłącznie zobaczyć, ile się jest winnym — płatność siedziała wyłącznie
  // na karcie pojedynczego zlecenia.
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoggedIn(false); setLoading(false); return; }
      setLoggedIn(true);
      const [res, inv] = await Promise.all([
        fetch("/api/rozliczenia"),
        loadInvoiceData(supabase),
      ]);
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
      if (inv.ok) setInvoice(inv.data);
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

  const vat = vatTreatment(invoice);
  const round = (v: number) => Math.round(v * 100) / 100;
  const vatAmount = round(totalDone * vat.rate);
  const grossTotal = round(totalDone + vatAmount);
  const unpaidNet = items
    .filter((s) => s.status === "done" && s.payment_status !== "paid")
    .reduce((sum, s) => sum + s.price, 0);
  const unpaidGross = round(unpaidNet * (1 + vat.rate));
  // Faktury nie da się wystawić bez kompletu danych nabywcy — jeśli zlecenia
  // już są, a danych brak, to jest blokada rozliczenia, nie kosmetyka.
  const invoiceReady = isInvoiceComplete(invoice);

  async function pay(caseId: string) {
    setPaying(caseId);
    try {
      const res = await fetch("/api/platnosci/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPaying(null);
    } catch {
      setPaying(null);
    }
  }

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
    <PageStack>

      {/* Header */}
      <PageHead
        kicker={t("kicker")}
        title={t("title")}
        lead={t("lead")}
        back={{ href: "/symulacje", label: t("back") }}
        actions={
          filtered.length > 0 && (
            <Btn variant="secondary" size="sm" onClick={() => exportCsv(filtered, t, ts, f, vat.rate)}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("exportCsv")}
            </Btn>
          )
        }
      />

      {/* Bez kompletu danych nabywcy nie powstanie faktura — mówimy o tym
          zanim klient zacznie szukać, czemu jej nie dostał. */}
      {loggedIn && !loading && !invoiceReady && items.length > 0 && (
        <Notice
          tone="warn"
          title={t("invoiceIncompleteTitle")}
          actions={
            <a href="#dane-do-faktury" className={btnCls("primary", "sm")}>
              {t("invoiceIncompleteCta")}
            </a>
          }
        >
          <p>{t("invoiceIncompleteLead")}</p>
        </Notice>
      )}

      {/* Dane do faktury — zunifikowane dane rozliczeniowe (wspólne z Profilem) */}
      {loggedIn && (
        <details id="dane-do-faktury" className="group scroll-mt-24 overflow-hidden rounded-card border border-hairline bg-panel">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile border border-primary/20 bg-primary/10 text-accent">
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label={t("kpiTotal")}
              value={f.fmtPrice(totalDone, { decimals: true })}
              sub={t("jobsCount", { n: countDone })}
            />
            <Kpi
              label={vat.treatment === "standard" ? t("kpiVat", { rate: Math.round(vat.rate * 100) }) : t("kpiVatNone")}
              value={vat.treatment === "standard" ? f.fmtPrice(vatAmount, { decimals: true }) : "—"}
              sub={t(`vatNote.${vat.treatment}`)}
            />
            <Kpi label={t("kpiGross")} value={f.fmtPrice(grossTotal, { decimals: true })} tone="ink" sub={t("gross")} />
            <Kpi
              label={t("kpiToPay")}
              value={f.fmtPrice(unpaidGross, { decimals: true })}
              tone={unpaidGross > 0 ? "warn" : "ok"}
              sub={unpaidGross > 0 ? t("gross") : t("allPaid")}
            />
          </div>

          {/* Aktywne zlecenia nie mają jeszcze ceny końcowej — mówimy to wprost,
              żeby kwota u góry nie wyglądała na niepełną. */}
          {countActive > 0 && (
            <p className="text-fr-sm text-muted">{t("activeNote", { n: countActive })}</p>
          )}

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
                                {s.server_label && <span>{s.server_label}</span>}
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
                                s.payment_status === "paid" ? (
                                  <Chip tone="ok" className="mt-1">{t("paid")}</Chip>
                                ) : (
                                  <Btn
                                    variant="primary"
                                    size="sm"
                                    className="mt-1"
                                    disabled={paying === s.case_id}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); pay(s.case_id); }}
                                  >
                                    {paying === s.case_id ? t("paying") : t("payNow")}
                                  </Btn>
                                )
                              )}
                            </div>

                            {/* Link */}
                            <Link
                              href={`/symulacje/${s.case_id}`}
                              className="shrink-0 text-faint transition-colors group-hover:text-accent"
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

              {/* Podsumowanie — w rozbiciu, którego wymaga faktura */}
              <div className="rounded-card border border-hairline bg-panel-deep px-4 py-3.5">
                <p className="mb-2 font-mono text-fr-micro uppercase text-muted">
                  {t("sum", { filter: (filter === "all" ? ts("all") : TABS.find((tab) => tab.id === filter)?.label ?? "").toLowerCase() })}
                </p>
                <dl className="space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-fr-sm text-muted">{t("net")}</dt>
                    <dd className="fr-num font-mono text-fr-sm text-ink">{f.fmtPrice(filteredTotal, { decimals: true })}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-fr-sm text-muted">
                      {vat.treatment === "standard" ? t("kpiVat", { rate: Math.round(vat.rate * 100) }) : t("kpiVatNone")}
                    </dt>
                    <dd className="fr-num font-mono text-fr-sm text-muted">
                      {vat.treatment === "standard" ? f.fmtPrice(round(filteredTotal * vat.rate), { decimals: true }) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-hairline-soft pt-2">
                    <dt className="font-mono text-fr-micro uppercase text-muted">{t("gross")}</dt>
                    <dd className="fr-num font-heading text-fr-h4 text-ink">
                      {f.fmtPrice(round(filteredTotal * (1 + vat.rate)), { decimals: true })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </>
      )}
    </PageStack>
    </Shell>
  );
}
