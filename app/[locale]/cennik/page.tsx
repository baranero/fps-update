import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cloudSeoUrls } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "cloudPricing.metadata" });
  const { canonical, languages } = cloudSeoUrls(locale, "/cennik");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
  };
}

const MODEL_ICONS: Record<string, string> = {
  m1: "M13 10V3L4 14h7v7l9-11h-7z",
  m2: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  m3: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
};

export default async function CennikPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("cloudPricing");
  const tn = await getTranslations("cloudNav");

  const model = (["m1", "m2", "m3"] as const).map((k) => ({
    key: k,
    icon: MODEL_ICONS[k],
    title: t(`model.${k}Title`),
    desc: t(`model.${k}Desc`),
  }));
  const examples = (["e1", "e2", "e3"] as const).map((k) => ({
    key: k,
    name: t(`examples.${k}Name`),
    spec: t(`examples.${k}Spec`),
    price: t(`examples.${k}Price`),
  }));
  const included = (["i1", "i2", "i3", "i4", "i5", "i6"] as const).map((k) => t(`included.${k}`));

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

      <section className="py-14 md:py-16">
        <div className="container max-w-5xl space-y-12">

          {/* Jak liczymy koszt */}
          <div>
            <h2 className="mb-5 text-center font-display text-xl font-bold text-slate-900 dark:text-white">{t("modelHeading")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {model.map((m) => (
                <div key={m.key} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1E232E]">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={m.icon} />
                    </svg>
                  </div>
                  <h3 className="font-display text-[16px] font-bold text-slate-900 dark:text-white">{m.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Estymator — główny „cennik w akcji" */}
          <div className="grid grid-cols-1 gap-8 rounded-2xl border border-primary/20 bg-[#0B1120] p-8 md:grid-cols-[1.3fr_1fr] md:items-center md:p-10">
            <div>
              <h2 className="font-display text-[clamp(20px,3vw,28px)] font-extrabold leading-tight tracking-tight text-white text-wrap-balance">
                {t("ctaTitle")}
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">{t("ctaLead")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/symulacje/nowa" className="rounded-xl bg-primary px-7 py-3.5 text-[14px] font-extrabold text-white transition-colors hover:bg-primary/90">
                  {tn("run")}
                </Link>
              </div>
            </div>
            {/* W cenie */}
            <div className="rounded-xl border border-slate-700/50 bg-white/[0.03] p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-primary">{t("includedHeading")}</p>
              <ul className="space-y-2.5">
                {included.map((label) => (
                  <li key={label} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Przykładowe wyceny */}
          <div>
            <div className="mb-1 text-center">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">{t("examplesHeading")}</h2>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("examplesNote")}</p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {examples.map((e) => (
                <div key={e.key} className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-[#1E232E]">
                  <p className="font-display text-[16px] font-bold text-slate-900 dark:text-white">{e.name}</p>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{e.spec}</p>
                  <p className="mt-4 font-mono text-2xl font-extrabold tabular-nums text-primary">{e.price}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
