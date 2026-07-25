import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CloudSpotlight from "@/components/CloudSpotlight";
import CloudMarketing from "@/components/Cloud/CloudMarketing";
import { cloudSeoUrls } from "@/lib/seo";

// Landing serwisu chmurowego FDSRun. Pod fdsrun.com middleware podstawia tę
// stronę w miejsce „/" (patrz middleware.ts), dzięki czemu produkt ma własny
// dom, a witryna usługowa fp-solutions.pl zostaje nietknięta.
// Treść celowo składana z istniejących sekcji (CloudSpotlight, CloudMarketing)
// i kluczy `symulacje.*` — jedno źródło prawdy dla oferty chmury.

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "cloudLanding.metadata" });
  const { canonical, languages } = cloudSeoUrls(locale, "/chmura");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: canonical,
    },
  };
}

export default async function CloudLandingPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("symulacje");
  const tc = await getTranslations("cloudSpotlight");
  const tn = await getTranslations("nav");

  return (
    <>
      {/* Hero produktu */}
      <section className="border-b border-slate-200/60 py-16 dark:border-slate-800/60 md:py-20">
        <div className="container max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              {t("badge")}
            </span>
          </div>

          <h1 className="text-[clamp(28px,4.4vw,44px)] font-extrabold leading-[1.08] tracking-tight text-slate-900 text-wrap-balance dark:text-white">
            {t("title")}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            {t("lead")}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/symulacje/nowa"
              className="rounded-xl bg-primary px-7 py-3.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
            >
              {tc("cta")}
            </Link>
            <Link
              href="/signin"
              className="rounded-xl border border-slate-200 px-7 py-3.5 text-[14px] font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {tn("account.signIn")}
            </Link>
          </div>

          {/* Pasek zaufania / specyfikacja */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {[t("trust.vm"), t("trust.epyc"), t("trust.payg"), t("trust.retention")].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-[#1E232E] dark:text-slate-400"
              >
                <svg className="h-3 w-3 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Jak to działa + atuty produktu */}
      <CloudSpotlight />

      {/* Co dostaniesz + FAQ */}
      <section className="py-16 md:py-20">
        <div className="container max-w-3xl">
          <CloudMarketing />
        </div>
      </section>
    </>
  );
}
