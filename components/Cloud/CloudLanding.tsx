import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import CloudSpotlight from "@/components/CloudSpotlight";
import CloudMarketing from "@/components/Cloud/CloudMarketing";
import HeroCloudPanel from "@/components/Cloud/HeroCloudPanel";

// Landing serwisu chmurowego FDSRun w układzie startupowym: dwukolumnowy hero
// z panelem-demo → „jak to działa" (CloudSpotlight) → „co dostaniesz" + FAQ
// (CloudMarketing) → finalne CTA. Renderowany jako root projektu „cloud"
// (fdsrun.com/) i pod /chmura (dev / alias). Sekcje z istniejących komponentów
// i palety; treść z kluczy `symulacje.*` / `cloudLanding.*`.
export default async function CloudLanding() {
  const t = await getTranslations("symulacje");
  const tc = await getTranslations("cloudSpotlight");
  const tn = await getTranslations("nav");
  const tl = await getTranslations("cloudLanding");

  return (
    <>
      {/* Hero — dwukolumnowy: treść + panel */}
      <section className="relative z-10 overflow-hidden border-b border-slate-200/60 pb-16 pt-14 dark:border-slate-800/60 md:pb-20 md:pt-20 lg:pb-24 lg:pt-20">
        <div className="container">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">

            {/* Left */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                  {t("badge")}
                </span>
              </div>

              <h1 className="mb-5 text-[clamp(28px,4.4vw,44px)] font-extrabold leading-[1.08] tracking-tight text-slate-900 text-wrap-balance dark:text-white">
                {t("title")}
              </h1>

              <p className="mb-8 max-w-[480px] text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t("lead")}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/symulacje/nowa"
                  className="rounded-xl bg-primary px-7 py-3.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  {tc("cta")}
                </Link>
                <Link
                  href="/signin"
                  className="rounded-xl border border-slate-200 px-7 py-3.5 text-[14px] font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {tn("account.signIn")}
                </Link>
              </div>

              {/* Pasek zaufania / specyfikacja */}
              <div className="mt-10 flex flex-wrap gap-2">
                {[t("trust.vm"), t("trust.epyc"), t("trust.payg"), t("trust.retention")].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-[#1E232E] dark:text-slate-400"
                  >
                    <svg className="h-3 w-3 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — panel demo */}
            <div className="lg:pl-4">
              <HeroCloudPanel />
              <p className="mt-3 text-right text-[12px] text-slate-400 dark:text-slate-600">
                {tl("panelCaption")}
              </p>
            </div>
          </div>
        </div>

        {/* Tło — dekoracyjne plamy */}
        <div className="pointer-events-none absolute right-0 top-0 z-[-1] opacity-20 lg:opacity-60">
          <svg width="450" height="556" viewBox="0 0 450 556" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="277" cy="63" r="225" fill="url(#c1)" />
            <circle cx="325.486" cy="302.87" r="180" transform="rotate(-37.6852 325.486 302.87)" fill="url(#c2)" />
            <defs>
              <linearGradient id="c1" x1="-54.5" y1="-178" x2="222" y2="288" gradientUnits="userSpaceOnUse">
                <stop stopColor="#DC3545" /><stop offset="1" stopColor="#DC3545" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="c2" x1="226.775" y1="-66.1548" x2="292.157" y2="351.421" gradientUnits="userSpaceOnUse">
                <stop stopColor="#DC3545" /><stop offset="1" stopColor="#DC3545" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>

      {/* Jak to działa + atuty produktu */}
      <CloudSpotlight />

      {/* Co dostaniesz + FAQ */}
      <section className="py-16 md:py-20">
        <div className="container max-w-3xl">
          <CloudMarketing />
        </div>
      </section>

      {/* Finalne CTA */}
      <section className="border-t border-slate-200/60 py-16 dark:border-slate-800/60 md:py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[#0B1120] px-6 py-12 text-center md:px-12 md:py-14">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(220,53,69,0.10) 0%, transparent 70%)" }}
            />
            <div className="relative">
              <h2 className="text-[clamp(22px,3.4vw,32px)] font-extrabold leading-tight tracking-tight text-white text-wrap-balance">
                {tl("finalCta.title")}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-400">
                {tl("finalCta.lead")}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/symulacje/nowa"
                  className="rounded-xl bg-primary px-7 py-3.5 text-[14px] font-extrabold text-white transition-colors hover:bg-primary/90"
                >
                  {tc("cta")}
                </Link>
                <Link
                  href="/signin"
                  className="rounded-xl border border-slate-700 px-7 py-3.5 text-[14px] font-bold text-slate-200 transition-colors hover:bg-white/5"
                >
                  {tn("account.signIn")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
