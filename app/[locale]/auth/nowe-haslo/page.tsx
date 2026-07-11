"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NoweHasloPage() {
  const t = useTranslations("auth.newPassword");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;
  const canSubmit = password.length >= 8 && password === confirm && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(t("error"));
      setLoading(false);
      return;
    }

    router.push("/narzedzia/profil?haslo=zmienione");
  }

  return (
    <section className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6">
            <span className="text-2xl font-black text-primary tracking-tight">FP Solutions</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("subtitle")}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("newPass")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("newPassPlaceholder")}
                className={`w-full rounded-lg border bg-slate-50 dark:bg-[#0B1120] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-colors ${
                  weak
                    ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                    : "border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-primary"
                }`}
              />
              {weak && (
                <p className="mt-1 text-xs text-red-500">{t("tooShort")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("confirm")}
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("confirmPlaceholder")}
                className={`w-full rounded-lg border bg-slate-50 dark:bg-[#0B1120] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-colors ${
                  mismatch
                    ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                    : "border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-primary"
                }`}
              />
              {mismatch && (
                <p className="mt-1 text-xs text-red-500">{t("mismatch")}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}{" "}
                <Link href="/auth/reset-password" className="underline font-medium">
                  {t("sendNewLink")}
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t("submitting") : t("submit")}
            </button>

          </form>
        </div>

      </div>
    </section>
  );
}
