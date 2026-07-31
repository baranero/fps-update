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
    <div className="bg-canvas text-ink">
      {/* Hero — lewy blok jak we wzorze, nie wyśrodkowany „marketing" */}
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

      {/* Siatka funkcji — karty z numeracją „rysunku technicznego" */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, i) => (
              <div
                key={it.key}
                className="rounded-card border border-hairline bg-panel p-6 transition-colors hover:border-primary/30"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-tile border border-primary/20 bg-primary/10 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={it.icon} />
                    </svg>
                  </span>
                  <span className="font-mono text-fr-micro uppercase text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-heading text-fr-h4 text-ink">{it.title}</h3>
                <p className="mt-2 text-fr-sm text-muted">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-hairline px-4 py-16">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap justify-center gap-3">
          <Link
            href="/symulacje/nowa"
            className="rounded-panel bg-primary px-7 py-3.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
          >
            {tn("run")}
          </Link>
          <Link
            href="/cennik"
            className="rounded-panel border border-hairline px-7 py-3.5 text-fr-body font-semibold text-ink transition-colors hover:bg-panel"
          >
            {tn("pricing")}
          </Link>
        </div>
      </section>
    </div>
  );
}
