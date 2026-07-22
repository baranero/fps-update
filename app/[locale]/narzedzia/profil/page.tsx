"use client";

import { useEffect, useState, useRef, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import InvoiceDataForm from "@/components/InvoiceDataForm";

type Profile = {
  full_name: string;
  company: string;
  nip: string;
  phone: string;
  address: string;
};

const empty: Profile = { full_name: "", company: "", nip: "", phone: "", address: "" };

type Stats = {
  simsTotal: number;
  simsActive: number;
  simsDone: number;
  reports: number;
  spentPaid: number;
};

type Msg = { ok: boolean; text: string };

const ACTIVE = new Set(["pending", "dispatched", "running"]);

function Toast({ msg, onDismiss }: { msg: Msg; onDismiss: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
      msg.ok
        ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
        : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
    }`}>
      {msg.ok ? (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

const quickLinks = [
  { key: "newSim", href: "/symulacje/nowa", accent: true, icon: "M3 15a4 4 0 004 4h9a5 5 0 001-9.9A5.002 5.002 0 007.1 7.1 4 4 0 003 11m9 0v6m0-6l-2.5 2.5M12 11l2.5 2.5" },
  { key: "history", href: "/symulacje/historia", accent: false, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "calc", href: "/narzedzia/kalkulatory", accent: false, icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { key: "reports", href: "/narzedzia/raporty", accent: false, icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "billing", href: "/symulacje/rozliczenia", accent: false, icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
  { key: "stats", href: "/symulacje/statystyki", accent: false, icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

function ProfilForm() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile>(empty);
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("email");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg | null>(null);
  const pwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showMsg(setter: (m: Msg | null) => void, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, msg: Msg) {
    setter(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (msg.ok) timerRef.current = setTimeout(() => setter(null), 4000);
  }

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("haslo") === "zmienione") {
      showMsg(setPwMsg, pwTimerRef, { ok: true, text: t("security.changedOk") });
      router.replace("/narzedzia/profil");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/signin"); return; }
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? null);
      setProvider(user.app_metadata?.provider ?? "email");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company, nip, phone, address")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") { setLoadError(true); setLoading(false); return; }
      setProfile({
        full_name: data?.full_name ?? "",
        company: data?.company ?? "",
        nip: data?.nip ?? "",
        phone: data?.phone ?? "",
        address: data?.address ?? "",
      });

      const [{ data: subs }, { count: reportsCount }] = await Promise.all([
        supabase.from("fds_submissions").select("status, price, payment_status"),
        supabase.from("reports").select("*", { count: "exact", head: true }),
      ]);

      const rows = subs ?? [];
      setStats({
        simsTotal: rows.length,
        simsActive: rows.filter((s) => ACTIVE.has(s.status)).length,
        simsDone: rows.filter((s) => s.status === "done").length,
        reports: reportsCount ?? 0,
        spentPaid: rows
          .filter((s) => s.payment_status === "paid")
          .reduce((sum, s) => sum + (s.price ?? 0), 0),
      });
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (pwNew.length < 8) {
      setPwMsg({ ok: false, text: t("security.tooShort") });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwCurrent,
    });
    if (verifyError) {
      showMsg(setPwMsg, pwTimerRef, { ok: false, text: t("security.currentWrong") });
      setPwLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pwNew });
    showMsg(setPwMsg, pwTimerRef, error
      ? { ok: false, text: t("security.changeErr") }
      : { ok: true, text: t("security.changedOk") }
    );
    if (!error) { setPwCurrent(""); setPwNew(""); }
    setPwLoading(false);
  }

  async function handleDelete() {
    if (deleteConfirm !== email) {
      setDeleteError(t("danger.mismatch"));
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);

    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (!res.ok) {
      setDeleteError(t("danger.error"));
      setDeleteLoading(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div className="space-y-6 max-w-3xl">
      <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
    </div>
  );

  if (loadError) return (
    <p className="text-sm text-red-500">{t("loadError")}</p>
  );

  const displayName = profile.full_name || email.split("@")[0];
  const initial = (profile.full_name || email || "?")[0]?.toUpperCase() ?? "?";
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const statCards = [
    { label: t("stats.simulations"), value: String(stats?.simsTotal ?? 0), href: "/symulacje/historia" },
    { label: t("stats.active"), value: String(stats?.simsActive ?? 0), href: "/symulacje/historia" },
    { label: t("stats.reports"), value: String(stats?.reports ?? 0), href: "/narzedzia/raporty" },
    { label: t("stats.spent"), value: `${(stats?.spentPaid ?? 0).toLocaleString(locale === "en" ? "en-GB" : "pl-PL")} zł`, href: "/symulacje/rozliczenia" },
  ];

  return (
    <div className="space-y-10 max-w-3xl">

      {/* Nagłówek konta */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {displayName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{email}</p>
            {memberSince && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("memberSince", { date: memberSince, provider: provider === "email" ? t("providerEmail") : provider })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {loggingOut ? t("signingOut") : t("signOut")}
        </button>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-4 hover:border-primary/40 transition-colors"
          >
            <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Szybki dostęp */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t("quickAccess")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className={`group flex items-start gap-4 rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                q.accent
                  ? "border-primary/30 bg-primary/[0.04] hover:border-primary/50"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                q.accent
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-primary"
              } transition-colors`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={q.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${q.accent ? "text-primary" : "text-slate-900 dark:text-white"}`}>
                  {t(`links.${q.key}Title`)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(`links.${q.key}Desc`)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Plan i rozliczenia */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("billing.title")}</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {t("billing.badge")}
              </span>
            </div>
            <p className="max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("billing.desc")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                {t("billing.chipEn")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                {t("billing.chipVat")}
              </span>
            </div>
          </div>
          <Link
            href="/symulacje/rozliczenia"
            className="shrink-0 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            {t("billing.cta")}
          </Link>
        </div>
      </section>

      {/* Dane do faktur — zunifikowane dane rozliczeniowe (wspólne z Rozliczeniami) */}
      <InvoiceDataForm variant="section" />

      {/* Bezpieczeństwo / hasło */}
      <section className="border-t border-slate-200 dark:border-slate-700 pt-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t("security.title")}</h2>
        {provider === "email" ? (
          <form onSubmit={handlePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("security.current")}
              </label>
              <input
                type="password"
                required
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-primary dark:focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("security.new")}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-primary dark:focus:border-primary transition-colors"
                placeholder={t("security.newPlaceholder")}
              />
            </div>
            {pwMsg && <Toast msg={pwMsg} onDismiss={() => setPwMsg(null)} />}
            <button
              type="submit"
              disabled={pwLoading}
              className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {pwLoading ? t("security.changing") : t("security.change")}
            </button>
          </form>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] p-4 max-w-lg">
            <svg className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.rich("security.oauthNote", { b: (c) => <strong className="capitalize">{c}</strong>, provider })}
            </p>
          </div>
        )}
      </section>

      {/* Usunięcie konta */}
      <section className="border-t border-red-100 dark:border-red-900/30 pt-8">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-500 mb-1">{t("danger.title")}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed max-w-lg">
          {t("danger.warning")}
        </p>
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block mb-1.5 text-xs text-slate-600 dark:text-slate-400">
              {t.rich("danger.confirmLabel", { b: (c) => <strong>{c}</strong>, email })}
            </label>
            <input
              type="email"
              value={deleteConfirm}
              onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(null); }}
              className="w-full rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-red-400 transition-colors"
              placeholder={email}
            />
          </div>
          {deleteError && (
            <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteLoading || deleteConfirm !== email}
            className="rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {deleteLoading ? t("danger.deleting") : t("danger.delete")}
          </button>
        </div>
      </section>

    </div>
  );
}

export default function ProfilPage() {
  return (
    <Suspense>
      <ProfilForm />
    </Suspense>
  );
}
