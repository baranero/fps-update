"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
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
      setError("Nie udało się wysłać e-maila. Sprawdź adres i spróbuj ponownie.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <section className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6">
            <span className="text-2xl font-black text-primary tracking-tight">FP Solutions</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset hasła</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Wyślemy link do zmiany hasła na Twój adres e-mail.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Sprawdź skrzynkę</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Wysłaliśmy link na <strong>{email}</strong>. Link jest ważny przez 24 godziny.
                </p>
              </div>
              <Link
                href="/signin"
                className="inline-block text-sm font-medium text-primary hover:underline mt-2"
              >
                Wróć do logowania
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Adres e-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jan@firma.pl"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-[#0B1120] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Wysyłam…" : "Wyślij link resetujący"}
              </button>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                <Link href="/signin" className="font-medium text-primary hover:underline">
                  Wróć do logowania
                </Link>
              </p>
            </form>
          )}
        </div>

      </div>
    </section>
  );
}
