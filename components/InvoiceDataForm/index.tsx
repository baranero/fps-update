"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { TONE_SURFACE, TONE_TEXT } from "@/lib/tone";
import { Btn, SectionLabel, Skeleton, inputCls, labelCls } from "@/components/Cloud/ui";

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
      <button onClick={onDismiss} className="opacity-50 transition-opacity hover:opacity-100">
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
      <label className={labelCls}>{label}</label>
      {opts?.hint && <p className="-mt-1 mb-1.5 text-fr-sm text-muted">{opts.hint}</p>}
      <input
        type="text"
        value={profile[key]}
        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className={inputCls}
      />
    </div>
  );

  if (loading) {
    return <Skeleton className="h-40 max-w-lg" />;
  }

  if (loadError) {
    return <p className="text-fr-sm text-primary">{t("invoice.saveErr")}</p>;
  }

  const formCls = variant === "panel" ? "space-y-4" : "max-w-lg space-y-4";

  const form = (
    <form onSubmit={handleSave} className={formCls}>
      {field(t("invoice.fullName"), "full_name", { placeholder: t("invoice.phFullName") })}
      {field(t("invoice.company"), "company", { placeholder: t("invoice.phCompany") })}
      {field(t("invoice.nip"), "nip", { placeholder: t("invoice.phNip"), hint: t("invoice.nipHint") })}
      {field(t("invoice.phone"), "phone", { placeholder: t("invoice.phPhone") })}
      {field(t("invoice.address"), "address", { placeholder: t("invoice.phAddress") })}

      {saveMsg && <Toast msg={saveMsg} onDismiss={() => setSaveMsg(null)} />}
      <Btn type="submit" disabled={saveLoading}>
        {saveLoading ? t("invoice.saving") : t("invoice.save")}
      </Btn>
    </form>
  );

  // Panel: bez własnego nagłówka (dostarcza go rodzic, np. <summary> w Rozliczeniach).
  if (variant === "panel") {
    return (
      <div className="space-y-4">
        <p className="text-fr-sm text-muted">{t("invoice.subtitle")}</p>
        {form}
      </div>
    );
  }

  // Section: pełna sekcja z nagłówkiem — drop-in dla strony Profilu.
  return (
    <section className="border-t border-hairline pt-8">
      <SectionLabel className="mb-1 block">{t("invoice.title")}</SectionLabel>
      <p className="mb-4 text-fr-sm text-muted">{t("invoice.subtitle")}</p>
      {form}
    </section>
  );
}
