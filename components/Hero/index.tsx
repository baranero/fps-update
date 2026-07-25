"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cloudUrl } from "@/lib/cloud";
import HeroCloudPanel from "@/components/Cloud/HeroCloudPanel";

const Hero = () => {
  const t = useTranslations("hero");

  return (
    <section
      id="home"
      className="relative z-10 overflow-hidden border-b border-slate-200/60 pb-16 pt-14 dark:border-slate-800/60 md:pb-20 md:pt-20 lg:pb-28 lg:pt-24"
    >
      <div className="container">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">

          {/* Left: services */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                {t("badge")}
              </span>
            </div>

            <h1 className="mb-5 text-[clamp(28px,4.4vw,44px)] font-extrabold leading-[1.08] tracking-tight text-slate-900 text-wrap-balance dark:text-white">
              {t("titleStart")}{" "}
              <span className="text-primary">{t("titleAccent")}</span>{" "}
              {t("titleEnd")}
            </h1>

            <p className="mb-8 max-w-[480px] text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
              {t("lead")}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/kontakt"
                className="rounded-xl bg-primary px-7 py-3.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
              >
                {t("ctaContact")}
              </Link>
              <a
                href={cloudUrl()}
                className="rounded-xl border border-primary/30 bg-primary/10 px-7 py-3.5 text-[14px] font-bold text-primary transition-colors hover:bg-primary/20"
              >
                {t("ctaRun")}
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
              {[t("trust.ssp"), t("trust.smoke"), t("trust.cfd"), t("trust.docs")].map((tag) => (
                <span
                  key={tag}
                  className="text-[12px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right: CFD Cloud panel */}
          <div className="lg:pl-4">
            <HeroCloudPanel />
            <p className="mt-3 text-right text-[12px] text-slate-400 dark:text-slate-600">
              {t("panel.caption")}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute right-0 top-0 z-[-1] opacity-20 lg:opacity-60">
        <svg width="450" height="556" viewBox="0 0 450 556" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="277" cy="63" r="225" fill="url(#h1)" />
          <circle cx="325.486" cy="302.87" r="180" transform="rotate(-37.6852 325.486 302.87)" fill="url(#h2)" />
          <defs>
            <linearGradient id="h1" x1="-54.5" y1="-178" x2="222" y2="288" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DC3545" /><stop offset="1" stopColor="#DC3545" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="h2" x1="226.775" y1="-66.1548" x2="292.157" y2="351.421" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DC3545" /><stop offset="1" stopColor="#DC3545" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="pointer-events-none absolute -left-10 bottom-0 z-[-1] opacity-20 lg:opacity-50">
        <svg width="364" height="201" viewBox="0 0 364 201" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.88928 72.3303C33.6599 66.4798 101.397 64.9086 150.178 105.427C211.155 156.076 229.59 162.093 264.333 166.607C299.076 171.12 337.718 183.657 362.889 212.24" stroke="url(#h3)" />
          <defs>
            <linearGradient id="h3" x1="184.389" y1="69.2405" x2="184.389" y2="212.24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DC3545" stopOpacity="0" /><stop offset="1" stopColor="#DC3545" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
