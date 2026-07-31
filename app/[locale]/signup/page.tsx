"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthShell,
  AuthError,
  AuthField,
  AuthSeparator,
  AuthSubmit,
  OAuthButtons,
} from "@/components/Cloud/AuthUI";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const tc = useTranslations("auth.common");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const errorFor = (code: string | null | undefined) => {
    switch (code) {
      case "user_already_exists": return t("errExists");
      case "email_address_invalid": return t("errInvalidEmail");
      case "weak_password": return t("errWeak");
      default: return t("errGeneric");
    }
  };

  async function handleOAuth(provider: "github" | "google") {
    if (!consent) {
      setError(t("consentRequiredOauth"));
      return;
    }
    setOauthLoading(provider);
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError(t("consentRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          consent_privacy: new Date().toISOString(),
          consent_terms: new Date().toISOString(),
        },
      },
    });

    if (authError) {
      setError(errorFor(authError.code ?? authError.message));
      setLoading(false);
      return;
    }

    router.push("/auth/potwierdz-email");
  }

  return (
    <AuthShell
      kicker="FDSRUN // REJESTRACJA"
      title={t("title")}
      subtitle={
        <>
          {t("haveAccount")}{" "}
          <Link href="/signin" className="font-medium text-primary hover:underline">
            {t("signIn")}
          </Link>
        </>
      }
    >
      {/* Zgoda RODO — świadomie NAD przyciskami, bo warunkuje także logowanie
          przez dostawcę zewnętrznego, nie tylko wysyłkę formularza. */}
      <label className="flex cursor-pointer items-start gap-3 rounded-panel border border-hairline bg-panel-deep p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => { setConsent(e.target.checked); setError(null); }}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-chip border-hairline accent-primary"
        />
        <span className="text-fr-sm text-muted">
          {t.rich("consent", {
            privacy: (chunks) => (
              <Link href="/polityka-prywatnosci" target="_blank" className="text-primary hover:underline">
                {chunks}
              </Link>
            ),
            terms: (chunks) => (
              <Link href="/regulamin" target="_blank" className="text-primary hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      <OAuthButtons
        onPick={handleOAuth}
        active={oauthLoading}
        disabled={oauthLoading !== null || loading}
        googleLabel={t("google")}
        githubLabel={t("github")}
        redirectingLabel={tc("redirecting")}
      />

      <AuthSeparator label={tc("orEmail")} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="email"
          label={tc("email")}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={tc("emailPlaceholder")}
        />

        <AuthField
          id="password"
          label={tc("password")}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
        />

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading} disabled={loading || oauthLoading !== null}>
          {loading ? t("submitting") : t("submit")}
        </AuthSubmit>

        <p className="font-mono text-fr-label leading-relaxed text-muted">{t("gdpr")}</p>
      </form>
    </AuthShell>
  );
}
