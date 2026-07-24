import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import { Inter, Archivo, JetBrains_Mono } from "next/font/google";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { MARKETING_SITE } from "@/lib/seo";
import { Providers } from "../providers";

// Style CSS
import "node_modules/react-modal-video/css/modal-video.css";
import "../../styles/index.css";

// Fonty self-hostowane przez next/font (bez żądań do Google w runtime):
//  - Inter    → tekst / UI (--font-sans)
//  - Archivo  → nagłówki display (--font-display)
//  - JetBrains Mono → dane, kody norm, wymiary (--font-mono)
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const archivo = Archivo({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-mono", display: "swap" });

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
      <body className={`bg-slate-50 dark:bg-[#0B1120] font-sans ${inter.variable} ${archivo.variable} ${jetbrainsMono.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            {children}
            <Footer />
            <ScrollToTop />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
