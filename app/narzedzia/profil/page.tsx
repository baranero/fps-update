"use client";

import { useEffect, useState, useRef, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string;
  company: string;
  nip: string;
  phone: string;
  address: string;
};

const empty: Profile = { full_name: "", company: "", nip: "", phone: "", address: "" };

type Msg = { ok: boolean; text: string };

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

function ProfilForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile>(empty);
  const [email, setEmail] = useState("");
  const [loadError, setLoadError] = useState(false);

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

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company, nip, phone, address")
        .eq("id", user.id)
        .single();

      // PGRST116 = no rows — konto założone przed triggerem, traktujemy jako pusty profil
      if (error && error.code !== "PGRST116") { setLoadError(true); return; }
      setProfile({
        full_name: data?.full_name ?? "",
        company: data?.company ?? "",
        nip: data?.nip ?? "",
        phone: data?.phone ?? "",
        address: data?.address ?? "",
      });
    }
    load();
  }, [router]);

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

  if (loadError) return (
    <p className="text-sm text-red-500">Nie udało się załadować profilu.</p>
  );

  return (
    <div className="space-y-10 max-w-lg">

      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Profil</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{email}</p>
      </div>

      {/* Dane */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Dane do faktur</h2>
        <form onSubmit={handleSave} className="space-y-4">
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

      {/* Hasło */}
      <section className="border-t border-slate-200 dark:border-slate-700 pt-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Zmiana hasła</h2>
        <form onSubmit={handlePassword} className="space-y-4">
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
      </section>

      {/* Usunięcie konta */}
      <section className="border-t border-red-100 dark:border-red-900/30 pt-8">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-500 mb-1">Usuń konto</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane, historia symulacji i raporty zostaną trwale usunięte zgodnie z art. 17 RODO.
        </p>
        <div className="space-y-3">
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
