import Image from "next/image";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Kicker from "@/components/ui/Kicker";
import { ArrowRightIcon } from "@/components/ui/Icon";

const AboutSectionTwo = () => {
  const t = useTranslations("about");

  return (
    <section className="py-16 md:py-20 lg:py-24">
      <div className="container">
        <div className="-mx-4 flex flex-wrap items-center">
          {/* Obraz */}
          <div className="w-full px-4 lg:w-1/2">
            <div className="relative mx-auto mb-12 aspect-[25/24] max-w-[500px] lg:m-0">
              <Image
                src="/images/about/pw.png"
                alt={t("pwTitle")}
                fill
                className="mx-auto max-w-full object-contain drop-shadow-sm dark:drop-shadow-none"
              />
            </div>
          </div>

          {/* Tekst */}
          <div className="w-full px-4 lg:w-1/2">
            <Kicker>{t("eduKicker")}</Kicker>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t("eduTitle")}
            </h2>
            <p className="mt-5 max-w-[470px] text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
              {t("eduDesc")}
            </p>

            <div className="mt-8 max-w-[470px] space-y-6">
              <div className="border-l-2 border-primary/30 pl-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {t("sgspTitle")}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {t("sgspDesc")}
                </p>
              </div>
              <div className="border-l-2 border-primary/30 pl-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {t("pwTitle")}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {t("pwDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 border-t border-slate-200 pt-16 dark:border-slate-800">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {t("ctaTitle")}
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t("ctaDesc")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/kontakt" variant="primary">
                {t("ctaPrimary")}
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
              <Button href="/narzedzia/kalkulatory/cnbop" variant="ghost">
                {t("ctaSecondary")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSectionTwo;
