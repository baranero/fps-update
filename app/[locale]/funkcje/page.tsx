import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cloudSeoUrls } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "cloudFeatures.metadata" });
  const { canonical, languages } = cloudSeoUrls(locale, "/funkcje");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
  };
}

// Ikony sekcji (heroicons-style, stroke).
const ICONS: Record<string, string> = {
  f1: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  f2: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 7h10v10H7V7z",
  f3: "M9 7h6m-6 4h6m-6 4h4M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z",
  f4: "M3 3v18h18M7 14l3-3 3 3 5-6",
  f5: "M12 15V3m0 12l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  f6: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
};

export default async function FunkcjePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("cloudFeatures");
  const tn = await getTranslations("cloudNav");

  const items = (["f1", "f2", "f3", "f4", "f5", "f6"] as const).map((k) => ({
    key: k,
    icon: ICONS[k],
    title: t(`items.${k}Title`),
    desc: t(`items.${k}Desc`),
  }));

  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200/60 py-16 dark:border-slate-800/60 md:py-20">
        <div className="container max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t("badge")}</span>
          </div>
          <h1 className="font-display text-[clamp(26px,4vw,40px)] font-extrabold leading-[1.1] tracking-tight text-slate-900 text-wrap-balance dark:text-white">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            {t("lead")}
          </p>
        </div>
      </section>

      {/* Siatka funkcji */}
      <section className="py-14 md:py-16">
        <div className="container">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <div
                key={it.key}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-primary/30 dark:border-slate-800 dark:bg-[#1E232E]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={it.icon} />
                  </svg>
                </div>
                <h3 className="font-display text-[17px] font-bold text-slate-900 dark:text-white">{it.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200/60 py-14 dark:border-slate-800/60">
        <div className="container flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/symulacje/nowa"
              className="rounded-xl bg-primary px-7 py-3.5 text-[14px] font-extrabold text-white transition-colors hover:bg-primary/90"
            >
              {tn("run")}
            </Link>
            <Link
              href="/cennik"
              className="rounded-xl border border-slate-200 px-7 py-3.5 text-[14px] font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {tn("pricing")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
