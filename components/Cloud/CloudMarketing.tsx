"use client";

import { useTranslations } from "next-intl";

// Sekcje ofertowe chmury („co dostaniesz" + FAQ). Współdzielone przez landing
// FDSRun i krok „upload" kreatora, żeby treść oferty istniała w jednym miejscu.
export default function CloudMarketing() {
  const t = useTranslations("symulacje");

  const deliverables = [
    { title: t("deliverables.d1Title"), desc: t("deliverables.d1Desc"), icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z M4 9h16 M9 4v16" },
    { title: t("deliverables.d2Title"), desc: t("deliverables.d2Desc"), icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { title: t("deliverables.d3Title"), desc: t("deliverables.d3Desc"), icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { title: t("deliverables.d4Title"), desc: t("deliverables.d4Desc"), icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  ];

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
  ];

  return (
    <div className="space-y-8">
      {/* Co otrzymasz */}
      <div>
        <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">{t("deliverables.heading")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {deliverables.map((d) => (
            <div
              key={d.title}
              className="flex items-start gap-3.5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#1E232E]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">{t("faq.heading")}</p>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-[#1E232E]">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-slate-700 transition-colors hover:text-primary dark:text-slate-200 dark:hover:text-white [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
