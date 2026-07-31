"use client";

import { useEffect, useState, useRef, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cloudHomePath, marketingUrl } from "@/lib/cloud";
import InvoiceDataForm from "@/components/InvoiceDataForm";
import { ACTIVE_STATUSES } from "@/lib/status";
import { fmtPrice } from "@/lib/format";
import { TONE_SURFACE, TONE_TEXT } from "@/lib/tone";
import {
  Btn, BtnLink, Chip, SectionLabel, Shell, Skeleton, cardCls, cardHoverCls, inputCls, labelCls,
} from "@/components/Cloud/ui";

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

const ACTIVE = ACTIVE_STATUSES;

function Toast({ msg, onDismiss }: { msg: Msg; onDismiss: () => void }) {
  const tone = msg.ok ? "ok" : "primary";
  return (
    <div className={`flex items-center gap-3 rounded-panel border px-4 py-3 text-fr-sm ${TONE_SURFACE[tone]} ${TONE_TEXT[tone]}`}>
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
  { key: "calc", href: "/narzedzia/kalkulatory", external: true, accent: false, icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { key: "reports", href: "/symulacje/raporty", accent: false, icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
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
      router.replace("/symulacje/profil");
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
    router.push(cloudHomePath());
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
    router.push(cloudHomePath());
  }

  if (loading) return (
    <Shell width="md">
      <div className="space-y-6">
        <Skeleton />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-40" />
      </div>
    </Shell>
  );

  if (loadError) return (
    <Shell width="md">
      <p className="text-fr-sm text-primary">{t("loadError")}</p>
    </Shell>
  );

  const displayName = profile.full_name || email.split("@")[0];
  const initial = (profile.full_name || email || "?")[0]?.toUpperCase() ?? "?";
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const statCards = [
    { label: t("stats.simulations"), value: String(stats?.simsTotal ?? 0), href: "/symulacje/historia" },
    { label: t("stats.active"), value: String(stats?.simsActive ?? 0), href: "/symulacje/historia" },
    { label: t("stats.reports"), value: String(stats?.reports ?? 0), href: "/symulacje/raporty" },
    { label: t("stats.spent"), value: fmtPrice(stats?.spentPaid ?? 0), href: "/symulacje/rozliczenia" },
  ];

  return (
    <Shell width="md">
      <div className="space-y-10">

      {/* Nagłówek konta */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-panel bg-primary font-heading text-fr-h3 text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <span className="mb-1.5 block font-mono text-fr-micro uppercase text-faint">FDSRUN // KONTO</span>
            <h1 className="truncate font-heading text-fr-h2 text-ink">
              {displayName}
            </h1>
            <p className="truncate font-mono text-fr-sm text-muted">{email}</p>
            {memberSince && (
              <p className="mt-0.5 text-fr-sm text-muted">
                {t("memberSince", { date: memberSince, provider: provider === "email" ? t("providerEmail") : provider })}
              </p>
            )}
          </div>
        </div>
        <Btn variant="secondary" size="sm" onClick={handleLogout} disabled={loggingOut}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {loggingOut ? t("signingOut") : t("signOut")}
        </Btn>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href} className={`group ${cardHoverCls} p-4`}>
            <p className="fr-num font-heading text-fr-h2 text-ink">{s.value}</p>
            <p className="mt-1 font-mono text-fr-micro uppercase text-faint transition-colors group-hover:text-primary">
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Szybki dostęp */}
      <section>
        <SectionLabel className="mb-3 block">{t("quickAccess")}</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickLinks.map((q) => {
            const Tag = q.external ? "a" : Link;
            const href = q.external ? marketingUrl(q.href) : q.href;
            return (
            <Tag
              key={q.href}
              href={href}
              className={`group flex items-start gap-4 rounded-card border p-4 transition-colors ${
                q.accent
                  ? "border-primary/30 bg-primary/[0.04] hover:border-primary/50"
                  : "border-hairline bg-panel hover:border-primary/40"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-tile border transition-colors ${
                q.accent
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-hairline-soft bg-panel-deep text-muted group-hover:border-primary/30 group-hover:text-primary"
              }`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={q.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className={`font-heading text-fr-h4 ${q.accent ? "text-primary" : "text-ink"}`}>
                  {t(`links.${q.key}Title`)}
                </p>
                <p className="mt-0.5 text-fr-sm text-muted">
                  {t(`links.${q.key}Desc`)}{q.external ? " ↗" : ""}
                </p>
              </div>
            </Tag>
            );
          })}
        </div>
      </section>

      {/* Plan i rozliczenia */}
      <section className={`${cardCls} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <h2 className="font-heading text-fr-h4 text-ink">{t("billing.title")}</h2>
              <Chip tone="primary">{t("billing.badge")}</Chip>
            </div>
            <p className="max-w-md text-fr-sm text-muted">
              {t("billing.desc")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip dot>{t("billing.chipEn")}</Chip>
              <Chip dot>{t("billing.chipVat")}</Chip>
            </div>
          </div>
          <BtnLink href="/symulacje/rozliczenia" size="sm">
            {t("billing.cta")}
          </BtnLink>
        </div>
      </section>

      {/* Dane do faktur — zunifikowane dane rozliczeniowe (wspólne z Rozliczeniami) */}
      <InvoiceDataForm variant="section" />

      {/* Bezpieczeństwo / hasło */}
      <section className="border-t border-hairline pt-8">
        <SectionLabel className="mb-4 block">{t("security.title")}</SectionLabel>
        {provider === "email" ? (
          <form onSubmit={handlePassword} className="max-w-lg space-y-4">
            <div>
              <label className={labelCls}>{t("security.current")}</label>
              <input
                type="password"
                required
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className={labelCls}>{t("security.new")}</label>
              <input
                type="password"
                required
                minLength={8}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className={inputCls}
                placeholder={t("security.newPlaceholder")}
              />
            </div>
            {pwMsg && <Toast msg={pwMsg} onDismiss={() => setPwMsg(null)} />}
            <Btn type="submit" disabled={pwLoading}>
              {pwLoading ? t("security.changing") : t("security.change")}
            </Btn>
          </form>
        ) : (
          <div className="flex max-w-lg items-start gap-3 rounded-card border border-hairline bg-panel-deep p-4">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-fr-sm text-muted">
              {t.rich("security.oauthNote", { b: (c) => <strong className="capitalize">{c}</strong>, provider })}
            </p>
          </div>
        )}
      </section>

      {/* Usunięcie konta */}
      <section className="border-t border-primary/30 pt-8">
        <SectionLabel className="mb-1 block !text-primary">{t("danger.title")}</SectionLabel>
        <p className="mb-4 max-w-lg text-fr-sm text-muted">
          {t("danger.warning")}
        </p>
        <div className="max-w-lg space-y-3">
          <div>
            <label className={labelCls}>
              {t.rich("danger.confirmLabel", { b: (c) => <strong>{c}</strong>, email })}
            </label>
            <input
              type="email"
              value={deleteConfirm}
              onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(null); }}
              className={`${inputCls} border-primary/40`}
              placeholder={email}
            />
          </div>
          {deleteError && <p className="text-fr-sm text-primary">{deleteError}</p>}
          <Btn variant="danger" onClick={handleDelete} disabled={deleteLoading || deleteConfirm !== email}>
            {deleteLoading ? t("danger.deleting") : t("danger.delete")}
          </Btn>
        </div>
      </section>

      </div>
    </Shell>
  );
}

export default function ProfilPage() {
  return (
    <Suspense>
      <ProfilForm />
    </Suspense>
  );
}
