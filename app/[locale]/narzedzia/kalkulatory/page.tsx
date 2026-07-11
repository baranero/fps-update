import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Kalkulatory PPOŻ | Fire Protection Solutions",
  description: "Profesjonalne kalkulatory inżynierskie do projektowania systemów ochrony przeciwpożarowej.",
};

const available = [
  {
    key: "cnbop",
    href: "/narzedzia/kalkulatory/cnbop",
    norm: "CNBOP-PIB W-0003:2016",
    hasBadge: true,
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    key: "pn",
    href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
    norm: "PN-B-02877-4:2025",
    hasBadge: false,
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: "quick",
    href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
    norm: "PN / CNBOP / VdS",
    hasBadge: false,
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const soon = [
  { key: "s1", norm: "PN-B-02852" },
  { key: "s2", norm: "Rozporządzenie MSW" },
  { key: "s3", norm: "Garaże / drogi ewakuacyjne" },
];

export default async function CalculatorsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("calculatorsPage");

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {available.map((calc) => (
          <Link
            key={calc.key}
            href={calc.href}
            className="group flex items-start gap-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] p-5 hover:border-primary/50 dark:hover:border-primary/40 hover:shadow-md transition-all duration-200"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors mt-0.5">
              {calc.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[11px] font-mono font-semibold text-primary">{calc.norm}</span>
                {calc.hasBadge && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary">{t("items.cnbop.tag")}</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{t(`items.${calc.key}.title`)}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(`items.${calc.key}.desc`)}</p>
            </div>
            <svg
              className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-primary transition-colors"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-400 mb-3">{t("soon")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {soon.map((calc) => (
            <div
              key={calc.key}
              className="rounded border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E232E] p-4 opacity-50"
            >
              <p className="text-[11px] font-mono font-semibold text-slate-400 mb-1">{calc.norm}</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t(`soonItems.${calc.key}.title`)}</p>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{t(`soonItems.${calc.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
