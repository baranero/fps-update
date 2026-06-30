"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  user_already_exists: "Konto z tym adresem e-mail już istnieje.",
  email_address_invalid: "Nieprawidłowy format adresu e-mail.",
  weak_password: "Hasło jest za słabe. Użyj co najmniej 8 znaków.",
};

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOAuth(provider: "github" | "google") {
    if (!consent) {
      setError("Zaakceptuj politykę prywatności i regulamin przed kontynuowaniem.");
      return;
    }
    setOauthLoading(provider);
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/narzedzia`,
      },
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Musisz zaakceptować politykę prywatności i regulamin.");
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
      const code = authError.code ?? authError.message;
      setError(ERROR_MESSAGES[code] ?? "Wystąpił błąd podczas rejestracji. Spróbuj ponownie.");
      setLoading(false);
      return;
    }

    router.push("/auth/potwierdz-email");
  }

  return (
    <section className="relative z-10 py-16 lg:py-24">
      <div className="container">
        <div className="mx-auto max-w-[440px]">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Załóż konto</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Masz już konto?{" "}
              <Link href="/signin" className="text-primary hover:underline font-medium">
                Zaloguj się
              </Link>
            </p>
          </div>

          {/* Zgoda RODO – przed przyciskami OAuth */}
          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => { setConsent(e.target.checked); setError(null); }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary accent-primary"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Zapoznałem/am się z{" "}
              <Link href="/polityka-prywatnosci" target="_blank" className="text-primary hover:underline">
                polityką prywatności
              </Link>{" "}
              i{" "}
              <Link href="/regulamin" target="_blank" className="text-primary hover:underline">
                regulaminem
              </Link>{" "}
              i akceptuję ich treść. Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi konta i realizacji usług.
            </span>
          </label>

          {/* OAuth */}
          <div className="space-y-2.5 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={oauthLoading !== null || loading}
              className="flex w-full items-center justify-center gap-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {oauthLoading === "google" ? "Przekierowanie…" : "Zarejestruj się przez Google"}
            </button>

            <button
              type="button"
              onClick={() => handleOAuth("github")}
              disabled={oauthLoading !== null || loading}
              className="flex w-full items-center justify-center gap-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              {oauthLoading === "github" ? "Przekierowanie…" : "Zarejestruj się przez GitHub"}
            </button>
          </div>

          {/* Separator */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 dark:bg-[#0B1120] px-3 text-xs text-slate-400 dark:text-slate-500">
                lub e-mail i hasło
              </span>
            </div>
          </div>

          {/* Email + password */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Adres e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-primary dark:focus:border-primary transition-colors"
                placeholder="jan@firma.pl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-primary dark:focus:border-primary transition-colors"
                placeholder="min. 8 znaków"
              />
            </div>

            {error && (
              <div className="rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || oauthLoading !== null}
              className="w-full rounded bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {loading ? "Rejestracja…" : "Zarejestruj się"}
            </button>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Administratorem danych jest Fire Protection Solutions. Dane przetwarzamy wyłącznie w celach wskazanych w polityce prywatności. Masz prawo dostępu, sprostowania, usunięcia i przenoszenia danych.
            </p>
          </form>

        </div>
      </div>
    </section>
  );
}
