import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { MARKETING_SITE } from "@/lib/seo";
import { SITE_MODE } from "@/lib/cloud";
import { Providers } from "../providers";
// Vercel Web Analytics — wbudowane w plan Pro, bez cookies (RODO-friendly, bez
// bannera zgody). Zbiera dane po włączeniu w panelu Vercela (zakładka Analytics).
import { Analytics } from "@vercel/analytics/react";

// Fonty self-hostowane przez @fontsource (variable, z podzbiorem latin-ext dla
// polskich znaków). Pliki z rejestru npm → build NIE pobiera z Google Fonts,
// więc żaden ETIMEDOUT nie zablokuje deployu. Zmienne --font-* w styles/index.css.
//  - Inter → tekst/UI (--font-sans), Archivo → nagłówki (--font-display),
//    JetBrains Mono → dane/kody (--font-mono).
//  - Manrope → nagłówki FDSRun (--font-heading), krój ze wzoru graficznego.
import "@fontsource-variable/inter";
import "@fontsource-variable/archivo";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/manrope";

// Style CSS
import "node_modules/react-modal-video/css/modal-video.css";
import "../../styles/index.css";

export const metadata: Metadata = {
  // Baza dla względnych URL-i w metadanych (OG image itp.). Root layout obsługuje
  // witrynę usługową — sekcja chmury (fdsrun.com) nadpisze to własnym layoutem.
  // Celowo NIE bierzemy tu NEXT_PUBLIC_APP_URL, bo ta wskazuje już chmurę.
  metadataBase: new URL(MARKETING_SITE),
  icons: { icon: "/favicon.webp" },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html suppressHydrationWarning lang={locale}>
      {/* Tło body wg projektu (SITE_MODE, build-time): chmura ma własną paletę
          powierzchni (canvas), usługi zostają na dotychczasowej. W dev
          SITE_MODE=null → tło usług, a strony chmury malują `bg-canvas` same. */}
      <body
        className={`font-sans ${
          SITE_MODE === "cloud" ? "bg-canvas text-ink" : "bg-slate-50 dark:bg-[#0B1120]"
        }`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            {children}
            <Footer />
            <ScrollToTop />
            <Analytics />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
