import { useTranslations, useLocale } from "next-intl";

type Section = {
  h: string;
  lead?: string;
  items?: string[];
  ordered?: boolean;
  note?: string;
};

// Wspólny szablon dokumentu prawnego — sekcje (§) z listami ol/ul,
// treść z namespace `legal.<doc>`. Data aktualizacji generowana lokalnie.
export default function LegalPage({ doc }: { doc: string }) {
  const t = useTranslations(`legal.${doc}`);
  const locale = useLocale();
  const sections = t.raw("sections") as Section[];
  const today = new Date().toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL");

  const listClass =
    "space-y-2.5 pl-5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400";

  return (
    <main className="container pb-20 pt-14 md:pt-16">
      <div className="mx-auto max-w-[800px]">
        <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
          {t("intro")}
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                {s.h}
              </h2>
              {s.lead && (
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {s.lead}
                </p>
              )}
              {s.items &&
                (s.ordered ? (
                  <ol className={`list-decimal ${listClass}`}>
                    {s.items.map((it, j) => (
                      <li key={j}>{it}</li>
                    ))}
                  </ol>
                ) : (
                  <ul className={`list-disc ${listClass}`}>
                    {s.items.map((it, j) => (
                      <li key={j}>{it}</li>
                    ))}
                  </ul>
                ))}
              {s.note && (
                <p className="mt-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {s.note}
                </p>
              )}
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-slate-200 pt-6 text-[14px] font-medium italic text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("footer", { date: today })}
        </p>
      </div>
    </main>
  );
}
