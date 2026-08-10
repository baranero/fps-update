"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { statusMeta, ACTIVE_STATUSES } from "@/lib/status";
import { useFormat } from "@/lib/format";
import {
  BtnLink, Chip, EmptyState, Meter, Notice, PageHead, SectionLabel, Shell, Skeleton,
  btnCls, cardCls, cardHoverCls,
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

// Miękki szacunek postępu aktywnego zlecenia (kolejka + obliczenia liczą się od
// created_at) — wyłącznie do poglądowego paska na Pulpicie, nie do rozliczeń.
function softProgress(item: Item, now: number): number | null {
  if (!item.wall_hours) return null;
  const elapsedSec = Math.max(0, (now - new Date(item.created_at).getTime()) / 1000);
  return Math.min(92, (elapsedSec / (item.wall_hours * 3600)) * 100);
}

export default function PulpitPage() {
  const t = useTranslations("symDashboard");
  const ts = useTranslations("status");
  const f = useFormat();
  const tr = useTranslations("symulacje");
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  // Do czasu płatności symulacje uruchamia wyłącznie admin — reszcie chowamy CTA „Nowa".
  const [canRun, setCanRun] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchItems(): Promise<Item[]> {
    const res = await fetch("/api/rozliczenia");
    const data = await res.json();
    const arr: Item[] = Array.isArray(data) ? data : [];
    setItems(arr);
    return arr;
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/symulacje/nowa"); return; }
      setCanRun(user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);
      setAuthChecked(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setUserName(profile?.full_name || user.email?.split("@")[0] || "");

      const arr = await fetchItems();
      setLoading(false);

      if (arr.some((s) => ACTIVE_STATUSES.has(s.status))) {
        intervalRef.current = setInterval(async () => {
          const updated = await fetchItems();
          if (!updated.some((s) => ACTIVE_STATUSES.has(s.status))) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }, 10_000);
      }
    }
    init();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tyknięcie zegara dla miękkiego paska postępu (tylko gdy coś trwa).
  useEffect(() => {
    const active = items.some((s) => ACTIVE_STATUSES.has(s.status));
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [items]);

  // Zanim potwierdzimy sesję — szkielet (gość jest przekierowany na /nowa).
  if (!authChecked) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} />)}
          </div>
        </div>
      </Shell>
    );
  }

  const active = items.filter((s) => ACTIVE_STATUSES.has(s.status));
  const done = items.filter((s) => s.status === "done");
  const recent = done.slice(0, 4);
  const spent = done.reduce((sum, s) => sum + s.price, 0);
  const toPay = done.filter((s) => s.payment_status !== "paid").reduce((sum, s) => sum + s.price, 0);

  const kpis = [
    { label: t("kpiTotal"), value: String(items.length), href: "/symulacje/historia", accent: false },
    { label: t("kpiActive"), value: String(active.length), href: "/symulacje/historia", accent: active.length > 0 },
    { label: t("kpiSpent"), value: f.fmtPrice(spent), href: "/symulacje/statystyki", accent: false },
    { label: t("kpiToPay"), value: f.fmtPrice(toPay), href: "/symulacje/rozliczenia", accent: toPay > 0 },
  ];

  const ADD_ICON = "M12 4v16m8-8H4";

  const shortcuts = [
    { title: t("scHistoryTitle"), desc: t("scHistoryDesc"), href: "/symulacje/historia", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { title: t("scBillingTitle"), desc: t("scBillingDesc"), href: "/symulacje/rozliczenia", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
    { title: t("scStatsTitle"), desc: t("scStatsDesc"), href: "/symulacje/statystyki", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { title: t("scInvoiceTitle"), desc: t("scInvoiceDesc"), href: "/symulacje/rozliczenia#dane-do-faktury", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  ];

  return (
    <Shell>
      <div className="space-y-10">

        {/* Baner „już wkrótce" — dla użytkowników bez dostępu do uruchamiania symulacji */}
        {!canRun && (
          <Notice
            tone="primary"
            title={tr("restricted.title")}
            actions={
              <a href="mailto:biuro@fp-solutions.pl" className={btnCls("primary", "sm")}>
                {tr("restricted.emailCta")}
              </a>
            }
          >
            <Chip tone="primary" dot className="mb-2">{tr("restricted.badge")}</Chip>
            <p>{tr("restricted.lead")}</p>
          </Notice>
        )}

        {/* Header + CTA */}
        <PageHead
          kicker="FDSRUN // PULPIT"
          title={userName ? t("greeting", { name: userName }) : t("title")}
          lead={t("subtitle")}
          actions={
            canRun && (
              <BtnLink href="/symulacje/nowa">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ADD_ICON} />
                </svg>
                {t("newSim")}
              </BtnLink>
            )
          }
        />

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className={`${cardHoverCls} p-5`}>
              <p className="mb-1.5 font-mono text-fr-micro uppercase text-faint">{k.label}</p>
              <p className={`fr-num font-heading text-fr-h2 ${k.accent ? "text-primary" : "text-ink"}`}>
                {k.value}
              </p>
            </Link>
          ))}
        </div>

        {/* Symulacje w toku */}
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <SectionLabel>{t("activeTitle")}</SectionLabel>
            {active.length > 0 && (
              <Chip tone="warn" dot pulse>
                {active.length} · {t("activeLive")}
              </Chip>
            )}
          </div>

          {loading ? (
            <Skeleton />
          ) : active.length === 0 ? (
            <EmptyState
              text={t("activeEmpty")}
              cta={canRun ? { href: "/symulacje/nowa", label: t("activeEmptyCta") } : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {active.map((s) => {
                const st = statusMeta(s.status);
                const pct = softProgress(s, now);
                return (
                  <Link key={s.case_id} href={`/symulacje/${s.case_id}`} className={`${cardHoverCls} p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={st.cls}>{ts(st.key)}</span>
                      <span className="font-mono text-fr-sm text-muted">{s.case_id}</span>
                    </div>
                    <p className="mt-2 truncate text-fr-body font-semibold text-ink">{s.file_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-fr-sm text-muted">
                      {s.server_type && <span className="uppercase">{s.server_type}</span>}
                      <span>{f.fmtCells(s.total_cells)} {t("cellsWord")}</span>
                      <span>{t("activeOrdered")} {f.fmtDate(s.created_at, { day: "numeric", month: "short" })}</span>
                    </div>
                    {pct != null && (
                      <div className="mt-3">
                        <Meter pct={pct} tone="warn" />
                        <p className="mt-1.5 font-mono text-fr-micro uppercase text-faint">{t("activeEstProgress")}</p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Ostatnio zakończone */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>{t("recentTitle")}</SectionLabel>
            {done.length > 0 && (
              <Link
                href="/symulacje/historia"
                className="font-mono text-fr-micro uppercase text-muted transition-colors hover:text-primary"
              >
                {t("recentViewAll")}
              </Link>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-16" />
          ) : recent.length === 0 ? (
            <EmptyState text={t("recentEmpty")} />
          ) : (
            <div className={`${cardCls} overflow-hidden`}>
              <div className="divide-y divide-hairline-soft">
                {recent.map((s) => (
                  <Link
                    key={s.case_id}
                    href={`/symulacje/${s.case_id}`}
                    className="group flex items-center gap-4 bg-panel px-4 py-3.5 transition-colors hover:bg-panel-deep"
                  >
                    <span className={statusMeta(s.status).cls}>{ts(statusMeta(s.status).key)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-fr-body font-medium text-ink">{s.file_name}</p>
                      <p className="font-mono text-fr-sm text-muted">
                        {f.fmtDate(s.completed_at ?? s.created_at, { day: "numeric", month: "short", year: "numeric" })}
                        {s.server_type && <span className="ml-2 uppercase">{s.server_type}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="fr-num font-mono text-fr-sm text-ink">{f.fmtPrice(s.price)}</p>
                      <Chip tone={s.payment_status === "paid" ? "ok" : "warn"} className="mt-1">
                        {s.payment_status === "paid" ? t("paid") : t("toPay")}
                      </Chip>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Szybki dostęp */}
        <div>
          <SectionLabel className="mb-3 block">{t("shortcutsTitle")}</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shortcuts.map((q) => (
              <Link key={q.href} href={q.href} className={`group flex items-start gap-4 ${cardHoverCls} p-4`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile border border-hairline-soft bg-panel-deep text-muted transition-colors group-hover:border-primary/30 group-hover:text-primary">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={q.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-fr-h4 text-ink">{q.title}</p>
                  <p className="mt-0.5 text-fr-sm text-muted">{q.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </Shell>
  );
}
