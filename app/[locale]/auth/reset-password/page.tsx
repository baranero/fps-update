"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthError, AuthField, AuthShell, AuthSubmit } from "@/components/Cloud/AuthUI";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.reset");
  const tc = useTranslations("auth.common");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=/auth/nowe-haslo`,
    });

    if (error) {
      setError(t("error"));
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <AuthShell
      kicker="FDSRUN // ODZYSKANIE DOSTĘPU"
      title={t("title")}
      subtitle={t("subtitle")}
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-tile border border-signal/30 bg-signal/10 text-signal">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-heading text-fr-h4 text-ink">{t("sentTitle")}</p>
            <p className="mt-1 text-fr-sm text-muted">
              {t.rich("sentBody", { b: (chunks) => <strong className="text-ink">{chunks}</strong>, email })}
            </p>
          </div>
          <Link
            href="/signin"
            className="inline-flex items-center gap-1.5 font-mono text-fr-label uppercase text-primary transition-opacity hover:opacity-80"
          >
            {tc("backToSignin")} <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="reset-email"
            label={tc("email")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tc("emailPlaceholder")}
          />

          {error && <AuthError>{error}</AuthError>}

          <AuthSubmit loading={loading} disabled={loading || !email.trim()}>
            {loading ? t("submitting") : t("submit")}
          </AuthSubmit>

          <p className="text-center">
            <Link
              href="/signin"
              className="font-mono text-fr-label uppercase text-muted transition-colors hover:text-primary"
            >
              {tc("backToSignin")}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
