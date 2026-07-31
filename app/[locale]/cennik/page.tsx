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
    <div className="bg-canvas text-ink">
      {/* Hero */}
      <section className="border-b border-hairline px-4 py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1400px]">
          <span className="mb-5 inline-flex items-center gap-2 rounded-chip border border-hairline px-2.5 py-1 font-mono text-fr-micro uppercase text-muted">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {t("badge")}
          </span>
          <h1 className="max-w-3xl fr-balance font-heading text-fr-h1 text-ink">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-fr-lead text-muted">{t("lead")}</p>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto w-full max-w-[1200px] space-y-16">

          {/* Jak liczymy koszt */}
          <div>
            <h2 className="mb-6 font-mono text-fr-micro uppercase text-faint">{t("modelHeading")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {model.map((m) => (
                <div key={m.key} className="rounded-card border border-hairline bg-panel p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-tile border border-primary/20 bg-primary/10 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={m.icon} />
                    </svg>
                  </div>
                  <h3 className="font-heading text-fr-h4 text-ink">{m.title}</h3>
                  <p className="mt-1.5 text-fr-sm text-muted">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Estymator — „cennik w akcji" na ciemnym panelu obliczeniowym */}
          <div className="relative grid grid-cols-1 gap-8 overflow-hidden rounded-card border border-hairline bg-panel-deep p-8 md:grid-cols-[1.3fr_1fr] md:items-center md:p-10">
            <div className="fr-dots pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative">
              <h2 className="fr-balance font-heading text-fr-h2 text-ink">{t("ctaTitle")}</h2>
              <p className="mt-3 max-w-md text-fr-body text-muted">{t("ctaLead")}</p>
              <div className="mt-7">
                <Link
                  href="/symulacje/nowa"
                  className="inline-flex rounded-panel bg-primary px-7 py-3.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
                >
                  {tn("run")}
                </Link>
              </div>
            </div>
            <div className="relative rounded-panel border border-hairline bg-panel p-5">
              <p className="mb-4 font-mono text-fr-micro uppercase text-faint">{t("includedHeading")}</p>
              <ul className="space-y-2.5">
                {included.map((label) => (
                  <li key={label} className="flex items-start gap-2.5 text-fr-sm text-muted">
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
            <h2 className="mb-1 font-mono text-fr-micro uppercase text-faint">{t("examplesHeading")}</h2>
            <p className="mb-6 text-fr-sm text-muted">{t("examplesNote")}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {examples.map((e) => (
                <div key={e.key} className="rounded-card border border-hairline bg-panel p-6">
                  <p className="font-heading text-fr-h4 text-ink">{e.name}</p>
                  <p className="mt-1 font-mono text-fr-micro uppercase text-faint">{e.spec}</p>
                  <p className="fr-num mt-5 font-heading text-fr-h2 text-primary">{e.price}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
