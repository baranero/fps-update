"use client";

import { useEffect, useState, useRef, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  {
    href: "/symulacje",
    title: "Nowa symulacja FDS",
    desc: "Wgraj plik .fds i uruchom obliczenia w chmurze.",
    accent: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9A5.002 5.002 0 007.1 7.1 4 4 0 003 11m9 0v6m0-6l-2.5 2.5M12 11l2.5 2.5" />
    ),
  },
  {
    href: "/symulacje/historia",
    title: "Historia symulacji",
    desc: "Przeglądaj i pobieraj wyniki wszystkich zleceń.",
    accent: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    href: "/narzedzia/kalkulatory",
    title: "Kalkulatory",
    desc: "Dobór klap dymowych i napowietrzania wg norm.",
    accent: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    ),
  },
  {
    href: "/narzedzia/raporty",
    title: "Raporty",
    desc: "Zapisane raporty PDF i DOCX z kalkulatorów.",
    accent: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
  {
    href: "/narzedzia/rozliczenia",
    title: "Rozliczenia",
    desc: "Faktury i historia płatności za symulacje.",
    accent: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    ),
  },
  {
    href: "/narzedzia/statystyki",
    title: "Statystyki",
    desc: "Zużycie zasobów i podsumowanie kosztów.",
    accent: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
];

function ProfilForm() {
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

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<Msg | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      showMsg(setPwMsg, pwTimerRef, { ok: true, text: "Hasło zostało zmienione." });
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

      // PGRST116 = no rows — konto założone przed triggerem, traktujemy jako pusty profil
      if (error && error.code !== "PGRST116") { setLoadError(true); setLoading(false); return; }
      setProfile({
        full_name: data?.full_name ?? "",
        company: data?.company ?? "",
        nip: data?.nip ?? "",
        phone: data?.phone ?? "",
        address: data?.address ?? "",
      });

      // Statystyki użytkownika (RLS ogranicza do własnych rekordów)
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

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMsg(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });

    showMsg(setSaveMsg, saveTimerRef, error
      ? { ok: false, text: "Błąd zapisu. Spróbuj ponownie." }
      : { ok: true, text: "Dane zostały zapisane." }
    );
    setSaveLoading(false);
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (pwNew.length < 8) {
      setPwMsg({ ok: false, text: "Nowe hasło musi mieć co najmniej 8 znaków." });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    const supabase = createClient();

    // Weryfikacja obecnego hasła przez re-login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwCurrent,
    });
    if (verifyError) {
      showMsg(setPwMsg, pwTimerRef, { ok: false, text: "Obecne hasło jest nieprawidłowe." });
      setPwLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pwNew });
    showMsg(setPwMsg, pwTimerRef, error
      ? { ok: false, text: "Błąd zmiany hasła. Spróbuj ponownie." }
      : { ok: true, text: "Hasło zostało zmienione." }
    );
    if (!error) { setPwCurrent(""); setPwNew(""); }
    setPwLoading(false);
  }

  async function handleDelete() {
    if (deleteConfirm !== email) {
      setDeleteError("Wpisany adres e-mail nie zgadza się.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);

    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (!res.ok) {
      setDeleteError("Błąd usuwania konta. Spróbuj ponownie lub skontaktuj się z nami.");
      setDeleteLoading(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const field = (
    label: string,
    key: keyof Profile,
    opts?: { placeholder?: string; hint?: string }
  ) => (
    <div>
      <label className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {opts?.hint && (
        <p className="mb-1.5 text-xs text-slate-400 dark:text-slate-500">{opts.hint}</p>
      )}
      <input
        type="text"
        value={profile[key]}
        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-primary dark:focus:border-primary transition-colors"
      />
    </div>
  );

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
    <p className="text-sm text-red-500">Nie udało się załadować profilu.</p>
  );

  const displayName = profile.full_name || email.split("@")[0];
  const initial = (profile.full_name || email || "?")[0]?.toUpperCase() ?? "?";
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const statCards = [
    { label: "Symulacje FDS", value: String(stats?.simsTotal ?? 0), href: "/symulacje/historia" },
    { label: "Aktywne obliczenia", value: String(stats?.simsActive ?? 0), href: "/symulacje/historia" },
    { label: "Raporty", value: String(stats?.reports ?? 0), href: "/narzedzia/raporty" },
    { label: "Wydatki (opłacone)", value: `${(stats?.spentPaid ?? 0).toLocaleString("pl-PL")} zł`, href: "/narzedzia/rozliczenia" },
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
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Konto od {memberSince} · logowanie: {provider === "email" ? "e-mail" : provider}
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
          {loggingOut ? "Wylogowywanie…" : "Wyloguj się"}
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
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors">
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Szybki dostęp */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Szybki dostęp</h2>
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
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{q.icon}</svg>
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${q.accent ? "text-primary" : "text-slate-900 dark:text-white"}`}>
                  {q.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{q.desc}</p>
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
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Model rozliczeń</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Pay-as-you-go
              </span>
            </div>
            <p className="max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Płacisz wyłącznie za faktyczne zużycie mocy obliczeniowej i storage — bez abonamentu i opłat
              stałych. Wycena pojawia się przed uruchomieniem każdej symulacji, a faktury znajdziesz w Rozliczeniach.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                Interfejs EN — wkrótce
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                Faktury VAT
              </span>
            </div>
          </div>
          <Link
            href="/narzedzia/rozliczenia"
            className="shrink-0 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Rozliczenia →
          </Link>
        </div>
      </section>

      {/* Dane do faktur */}
      <section className="border-t border-slate-200 dark:border-slate-700 pt-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Dane do faktur</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Wykorzystywane automatycznie przy wystawianiu faktur za symulacje.
        </p>
        <form onSubmit={handleSave} className="space-y-4 max-w-lg">
          {field("Imię i nazwisko", "full_name", { placeholder: "Jan Kowalski" })}
          {field("Firma", "company", { placeholder: "Fire Protection Sp. z o.o." })}
          {field("NIP", "nip", { placeholder: "0000000000", hint: "Bez myślników, tylko cyfry." })}
          {field("Telefon", "phone", { placeholder: "+48 000 000 000" })}
          {field("Adres", "address", { placeholder: "ul. Przykładowa 1, 00-000 Warszawa" })}

          {saveMsg && <Toast msg={saveMsg} onDismiss={() => setSaveMsg(null)} />}
          <button
            type="submit"
            disabled={saveLoading}
            className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {saveLoading ? "Zapisywanie…" : "Zapisz dane"}
          </button>
        </form>
      </section>

      {/* Bezpieczeństwo / hasło */}
      <section className="border-t border-slate-200 dark:border-slate-700 pt-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Bezpieczeństwo</h2>
        {provider === "email" ? (
          <form onSubmit={handlePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Obecne hasło
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
                Nowe hasło
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-primary dark:focus:border-primary transition-colors"
                placeholder="min. 8 znaków"
              />
            </div>
            {pwMsg && <Toast msg={pwMsg} onDismiss={() => setPwMsg(null)} />}
            <button
              type="submit"
              disabled={pwLoading}
              className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {pwLoading ? "Zmieniam…" : "Zmień hasło"}
            </button>
          </form>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] p-4 max-w-lg">
            <svg className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Logujesz się przez <strong className="capitalize">{provider}</strong>. Hasłem zarządzasz
              po stronie tego dostawcy — nie ma potrzeby ustawiać go tutaj.
            </p>
          </div>
        )}
      </section>

      {/* Usunięcie konta */}
      <section className="border-t border-red-100 dark:border-red-900/30 pt-8">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-500 mb-1">Usuń konto</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed max-w-lg">
          Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane, historia symulacji i raporty zostaną trwale usunięte zgodnie z art. 17 RODO.
        </p>
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block mb-1.5 text-xs text-slate-600 dark:text-slate-400">
              Wpisz swój adres e-mail, aby potwierdzić: <strong>{email}</strong>
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
            {deleteLoading ? "Usuwanie…" : "Trwale usuń konto"}
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
