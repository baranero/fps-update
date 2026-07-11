import Image from "next/image";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { CheckIcon, ArrowRightIcon } from "@/components/ui/Icon";

type Section = { h: string; p?: string; list?: string[]; note?: string };

// Wspólny szablon strony usługi — treść (lead, sekcje, CTA) pobierana
// z namespace `services.<slug>`. Jeden układ dla wszystkich usług.
export default function ServicePage({ slug, image }: { slug: string; image: string }) {
  const t = useTranslations(`services.${slug}`);
  const ts = useTranslations("services");
  const sections = t.raw("sections") as Section[];

  return (
    <section className="py-16 md:py-20 lg:py-24">
      <div className="container">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          {/* Obraz */}
          <div className="lg:sticky lg:top-24">
            <div className="relative mx-auto aspect-[25/24] w-full max-w-[480px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <Image src={image} alt={t("imageAlt")} fill className="object-cover" />
            </div>
          </div>

          {/* Treść */}
          <div className="max-w-[680px]">
            <p className="text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
              {t("lead")}
            </p>

            <div className="mt-10 space-y-10">
              {sections.map((s, i) => (
                <div key={i}>
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {s.h}
                  </h2>
                  {s.p && (
                    <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {s.p}
                    </p>
                  )}
                  {s.list && (
                    <ul className="mt-4 space-y-2.5">
                      {s.list.map((li, j) => (
                        <li
                          key={j}
                          className="flex gap-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400"
                        >
                          <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-primary" />
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.note && (
                    <p className="mt-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {s.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="relative mt-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/30">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <p className="text-[15px] font-semibold leading-relaxed text-slate-900 dark:text-white">
                {t("cta")}
              </p>
              <div className="mt-5">
                <Button href="/kontakt" variant="primary">
                  {ts("ctaButton")}
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
