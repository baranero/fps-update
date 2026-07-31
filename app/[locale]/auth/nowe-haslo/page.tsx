"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthField, AuthShell, AuthSubmit } from "@/components/Cloud/AuthUI";

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

    router.push("/symulacje/profil?haslo=zmienione");
  }

  return (
    <AuthShell
      kicker="FDSRUN // NOWE HASŁO"
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <AuthField
            id="new-password"
            label={t("newPass")}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("newPassPlaceholder")}
          />
          {weak && <p className="mt-1.5 text-fr-sm text-primary">{t("tooShort")}</p>}
        </div>

        <div>
          <AuthField
            id="confirm-password"
            label={t("confirm")}
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("confirmPlaceholder")}
          />
          {mismatch && <p className="mt-1.5 text-fr-sm text-primary">{t("mismatch")}</p>}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-panel border border-primary/40 bg-primary/[0.07] px-4 py-3 text-fr-sm text-ink"
          >
            {error}{" "}
            <Link href="/auth/reset-password" className="font-medium text-primary underline">
              {t("sendNewLink")}
            </Link>
          </div>
        )}

        <AuthSubmit loading={loading} disabled={!canSubmit}>
          {loading ? t("submitting") : t("submit")}
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
