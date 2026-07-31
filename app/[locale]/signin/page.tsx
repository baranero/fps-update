"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthShell,
  AuthError,
  AuthField,
  AuthSeparator,
  AuthSubmit,
  OAuthButtons,
} from "@/components/Cloud/AuthUI";

// Panel kontekstowy — pokazywany, gdy użytkownik trafił tu z konkretnego
// miejsca (?next=…). Zamiast emoji, które rozbijały techniczny ton reszty
// serwisu, lista jest numerowana w mono jak podpisy na rysunkach landingu.
function ProductPanel({ next }: { next: string }) {
  const t = useTranslations("auth.product");
  const isCfd = next.includes("symulacje") || next.includes("cfd");
  const features = isCfd
    ? [t("cfd1"), t("cfd2"), t("cfd3"), t("cfd4")]
    : [t("calc1"), t("calc2"), t("calc3"), t("calc4")];
  const title = isCfd ? t("cfdTitle") : t("calcTitle");
  const subtitle = isCfd ? t("cfdSubtitle") : t("calcSubtitle");

  return (
    <div className="flex h-full flex-col justify-center pr-8">
      <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-chip border border-hairline px-2.5 py-1 font-mono text-fr-label uppercase text-muted">
        <span className="h-1 w-1 rounded-full bg-primary" />
        {t("badge")}
      </span>

      <h2 className="mb-3 font-heading text-fr-h2 fr-balance text-ink">{title}</h2>
      <p className="mb-8 max-w-md text-fr-body text-muted">{subtitle}</p>

      <ul className="mb-10 space-y-0">
        {features.map((text, i) => (
          <li key={text} className="flex gap-4 border-t border-hairline-soft py-4">
            <span className="shrink-0 font-mono text-fr-label text-primary">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-fr-sm text-muted">{text}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-hairline pt-6">
        <p className="mb-3 text-fr-sm text-muted">{t("footer")}</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-panel border border-hairline px-5 py-2.5 text-fr-body font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary"
        >
          {t("signUp")}
        </Link>
      </div>
    </div>
  );
}

function SigninForm() {
  const t = useTranslations("auth.signin");
  const tc = useTranslations("auth.common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/symulacje";
  const urlError = searchParams.get("error");
  const hasContext = !!searchParams.get("next");

  const errorFor = (code: string | null | undefined) => {
    switch (code) {
      case "invalid_credentials": return t("errInvalid");
      case "email_not_confirmed": return t("errNotConfirmed");
      case "link_invalid": return t("errLinkInvalid");
      default: return tc("generic");
    }
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);
  const [error, setError] = useState<string | null>(urlError ? errorFor(urlError) : null);

  async function handleOAuth(provider: "github" | "google") {
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
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(errorFor(authError.code ?? authError.message));
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      kicker="FDSRUN // LOGOWANIE"
      title={t("title")}
      subtitle={
        <>
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("signUp")}
          </Link>
        </>
      }
      aside={hasContext ? <ProductPanel next={next} /> : undefined}
    >
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={tc("passwordPlaceholder")}
          action={
            <Link
              href="/auth/reset-password"
              className="font-mono text-fr-label text-muted transition-colors hover:text-primary"
            >
              {t("forgot")}
            </Link>
          }
        />

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading} disabled={loading || oauthLoading !== null}>
          {loading ? t("submitting") : t("submit")}
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}

export default function SigninPage() {
  return (
    <Suspense>
      <SigninForm />
    </Suspense>
  );
}
