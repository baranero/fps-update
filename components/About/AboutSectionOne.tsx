import Image from "next/image";
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui/Icon";

const AboutSectionOne = () => {
  const t = useTranslations("about");
  const points = ["p1", "p2", "p3", "p4", "p5"].map((k) => t(`points.${k}`));

  return (
    <section id="about" className="pt-16 md:pt-20 lg:pt-24">
      <div className="container">
        <div className="border-b border-slate-200 pb-16 dark:border-slate-800 md:pb-20 lg:pb-24">
          <div className="-mx-4 flex flex-wrap items-center">
            {/* Tekst */}
            <div className="w-full px-4 lg:w-1/2">
              <p className="font-mono text-[13px] font-medium text-primary">{t("name")}</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {t("tailoredTitle")}
              </h2>
              <p className="mt-5 max-w-[540px] text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t("tailoredDesc")}
              </p>

              <ul className="mt-8 grid max-w-[540px] gap-x-6 gap-y-4 sm:grid-cols-2">
                {points.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-3 text-[15px] font-medium text-slate-700 dark:text-slate-300"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Obraz */}
            <div className="mt-12 w-full px-4 text-center lg:mt-0 lg:w-1/2">
              <div className="relative mx-auto aspect-[25/24] max-w-[500px] lg:mr-0">
                <Image
                  src="/images/about/apoz.png"
                  alt={t("name")}
                  fill
                  className="mx-auto max-w-full object-cover drop-shadow-sm dark:drop-shadow-none lg:mr-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSectionOne;
