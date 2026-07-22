"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { statusMeta, ACTIVE_STATUSES } from "@/lib/status";
import { fmtCells, fmtPrice, fmtDate } from "@/lib/format";

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative z-10 min-h-screen bg-slate-50 py-10 dark:bg-[#0B1120]">
      <div className="container max-w-4xl">{children}</div>
    </section>
  );
}

export default function PulpitPage() {
  const t = useTranslations("symDashboard");
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
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
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
    { label: t("kpiSpent"), value: fmtPrice(spent), href: "/symulacje/statystyki", accent: false },
    { label: t("kpiToPay"), value: fmtPrice(toPay), href: "/symulacje/rozliczenia", accent: toPay > 0 },
  ];

  const shortcuts = [
    { title: t("scHistoryTitle"), desc: t("scHistoryDesc"), href: "/symulacje/historia", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { title: t("scBillingTitle"), desc: t("scBillingDesc"), href: "/symulacje/rozliczenia", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
    { title: t("scStatsTitle"), desc: t("scStatsDesc"), href: "/symulacje/statystyki", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { title: t("scInvoiceTitle"), desc: t("scInvoiceDesc"), href: "/symulacje/rozliczenia#dane-do-faktury", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  ];

  return (
    <Shell>
      <div className="space-y-10">

        {/* Header + CTA */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {userName ? t("greeting", { name: userName }) : t("title")}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
          </div>
          {canRun && (
            <Link
              href="/symulacje/nowa"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("newSim")}
            </Link>
          )}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5 transition-colors hover:border-primary/40"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${k.accent ? "text-primary" : "text-slate-900 dark:text-white"}`}>
                {k.value}
              </p>
            </Link>
          ))}
        </div>

        {/* Symulacje w toku */}
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("activeTitle")}</h2>
            {active.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {active.length} · {t("activeLive")}
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : active.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t("activeEmpty")}</p>
              {canRun && (
                <Link href="/symulacje/nowa" className="text-sm font-medium text-primary hover:underline">
                  {t("activeEmptyCta")}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {active.map((s) => {
                const st = statusMeta(s.status);
                const pct = softProgress(s, now);
                return (
                  <Link
                    key={s.case_id}
                    href={`/symulacje/${s.case_id}`}
                    className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{s.case_id}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{s.file_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {s.server_type && <span className="uppercase font-semibold">{s.server_type}</span>}
                      <span>{fmtCells(s.total_cells)} {t("cellsWord")}</span>
                      <span>{t("activeOrdered")} {fmtDate(s.created_at, { day: "numeric", month: "short" })}</span>
                    </div>
                    {pct != null && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-amber-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] italic text-slate-400 dark:text-slate-500">{t("activeEstProgress")}</p>
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
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("recentTitle")}</h2>
            {done.length > 0 && (
              <Link href="/symulacje/historia" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                {t("recentViewAll")}
              </Link>
            )}
          </div>

          {loading ? (
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("recentEmpty")}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.map((s) => (
                  <Link
                    key={s.case_id}
                    href={`/symulacje/${s.case_id}`}
                    className="flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-[#1E232E] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {statusMeta(s.status).label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.file_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {fmtDate(s.completed_at ?? s.created_at, { day: "numeric", month: "short", year: "numeric" })}
                        {s.server_type && <span className="ml-2 uppercase font-semibold">{s.server_type}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{fmtPrice(s.price)}</p>
                      <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        s.payment_status === "paid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {s.payment_status === "paid" ? t("paid") : t("toPay")}
                      </span>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t("shortcutsTitle")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shortcuts.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-start gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={q.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{q.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </Shell>
  );
}
