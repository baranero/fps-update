import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Potwierdź adres e-mail | Fire Protection Solutions",
};

export default function PotwierdzenieEmailPage() {
  return (
    <section className="relative z-10 py-16 lg:py-24">
      <div className="container">
        <div className="mx-auto max-w-[440px] text-center">

          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Sprawdź skrzynkę e-mail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Wysłaliśmy link potwierdzający na Twój adres e-mail.
            Kliknij w link, żeby aktywować konto i przejść do panelu.
          </p>

          <div className="rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1E232E] px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-left space-y-1 mb-6">
            <p>Link jest ważny przez <strong className="text-slate-700 dark:text-slate-300">24 godziny</strong>.</p>
            <p>Jeśli e-mail nie dotarł, sprawdź folder ze spamem.</p>
          </div>

          <Link
            href="/signin"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
          >
            ← Wróć do logowania
          </Link>

        </div>
      </div>
    </section>
  );
}
