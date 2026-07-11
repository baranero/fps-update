import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Narzędzia | Fire Protection Solutions",
  description: "Kalkulatory inżynierskie dla projektantów systemów PPOŻ.",
};

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("toolsHome");

  const calculators = [
    {
      key: "cnbop",
      href: "/narzedzia/kalkulatory/cnbop",
      norm: "CNBOP-PIB W-0003:2016",
      tag: t("items.cnbop.tag"),
    },
    {
      key: "pn",
      href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
      norm: "PN-B-02877-4:2025",
      tag: null,
    },
    {
      key: "quick",
      href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
      norm: "PN / CNBOP / VdS",
      tag: null,
    },
  ];

  const soon = [
    { norm: "PN-B-02852", title: t("soonItems.s1") },
    { norm: "Rozp. MSW", title: t("soonItems.s2") },
    { norm: "—", title: t("soonItems.s3") },
  ];

  return (
    <div className="space-y-10">

      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      {/* Kalkulatory */}
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">{t("calculators")}</p>
        <div className="grid grid-cols-1 gap-px bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden sm:grid-cols-3">
          {calculators.map((calc) => (
            <Link
              key={calc.key}
              href={calc.href}
              className="group bg-white dark:bg-[#1E232E] px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-2.5">
                <span className="font-mono text-[10px] font-semibold text-primary tracking-wide leading-tight">
                  {calc.norm}
                </span>
                {calc.tag && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 shrink-0 ml-2">
                    {calc.tag}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5 group-hover:text-primary transition-colors">
                {t(`items.${calc.key}.title`)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t(`items.${calc.key}.desc`)}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* W przygotowaniu */}
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{t("soon")}</p>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded">
          {soon.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <span className="font-mono text-[10px] text-slate-300 dark:text-slate-600 shrink-0 w-28">{s.norm}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
