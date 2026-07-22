"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
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

/**
 * Zunifikowane dane rozliczeniowe (dane do faktury) — jedno źródło prawdy:
 * kolumny full_name/company/nip/phone/address w tabeli `profiles`.
 * Ten sam komponent obsługuje sekcję w Profilu (variant="section") i panel
 * w Rozliczeniach (variant="panel"), więc zmiana w jednym miejscu jest
 * natychmiast widoczna w drugim.
 */
export default function InvoiceDataForm({ variant = "section" }: { variant?: "section" | "panel" }) {
  const t = useTranslations("profile");
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<Msg | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

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
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMsg(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveLoading(false); return; }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });

    const msg: Msg = error
      ? { ok: false, text: t("invoice.saveErr") }
      : { ok: true, text: t("invoice.savedOk") };
    setSaveMsg(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (msg.ok) timerRef.current = setTimeout(() => setSaveMsg(null), 4000);
    setSaveLoading(false);
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
        <p className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">{opts.hint}</p>
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

  if (loading) {
    return <div className="h-40 max-w-lg rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;
  }

  if (loadError) {
    return <p className="text-sm text-red-500">{t("invoice.saveErr")}</p>;
  }

  const formCls = variant === "panel" ? "space-y-4" : "space-y-4 max-w-lg";

  const form = (
    <form onSubmit={handleSave} className={formCls}>
      {field(t("invoice.fullName"), "full_name", { placeholder: t("invoice.phFullName") })}
      {field(t("invoice.company"), "company", { placeholder: t("invoice.phCompany") })}
      {field(t("invoice.nip"), "nip", { placeholder: t("invoice.phNip"), hint: t("invoice.nipHint") })}
      {field(t("invoice.phone"), "phone", { placeholder: t("invoice.phPhone") })}
      {field(t("invoice.address"), "address", { placeholder: t("invoice.phAddress") })}

      {saveMsg && <Toast msg={saveMsg} onDismiss={() => setSaveMsg(null)} />}
      <button
        type="submit"
        disabled={saveLoading}
        className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {saveLoading ? t("invoice.saving") : t("invoice.save")}
      </button>
    </form>
  );

  // Panel: bez własnego nagłówka (dostarcza go rodzic, np. <summary> w Rozliczeniach).
  if (variant === "panel") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("invoice.subtitle")}</p>
        {form}
      </div>
    );
  }

  // Section: pełna sekcja z nagłówkiem — drop-in dla strony Profilu.
  return (
    <section className="border-t border-slate-200 dark:border-slate-700 pt-8">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{t("invoice.title")}</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t("invoice.subtitle")}</p>
      {form}
    </section>
  );
}
