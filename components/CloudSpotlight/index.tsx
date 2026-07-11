import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const CloudSpotlight = () => {
  const t = useTranslations("cloudSpotlight");

  const steps = [
    { n: "1", title: t("steps.s1Title"), desc: t("steps.s1Desc") },
    { n: "2", title: t("steps.s2Title"), desc: t("steps.s2Desc") },
    { n: "3", title: t("steps.s3Title"), desc: t("steps.s3Desc") },
  ];

  const features = [
    { icon: "⚡", title: t("features.f1Title"), desc: t("features.f1Desc") },
    { icon: "🌍", title: t("features.f2Title"), desc: t("features.f2Desc") },
    { icon: "💳", title: t("features.f3Title"), desc: t("features.f3Desc") },
    { icon: "📦", title: t("features.f4Title"), desc: t("features.f4Desc") },
  ];

  return (
    <section className="relative overflow-hidden border-y border-slate-800/60 bg-[#0B1120] py-20">
      {/* background glow */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(220,53,69,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="container relative">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">

          {/* Left: how it works */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {t("badge")}
              </span>
            </div>

            <h2 className="mb-4 text-[clamp(24px,3.6vw,34px)] font-extrabold leading-[1.12] tracking-tight text-white text-wrap-balance">
              {t("titleStart")}{" "}
              <span className="text-primary">{t("titleAccent")}</span>
            </h2>

            <p className="mb-8 text-[15px] leading-relaxed text-slate-400">
              {t("lead")}
            </p>

            <div className="mb-10 space-y-5">
              {steps.map(({ n, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-mono text-[12px] font-bold text-primary">
                    {n}
                  </div>
                  <div className="pt-0.5">
                    <p className="mb-1 text-[14px] font-semibold text-white">
                      {title}
                    </p>
                    <p className="text-[13px] leading-relaxed text-slate-400">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/symulacje"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[14px] font-extrabold text-white transition-colors hover:bg-primary/90"
            >
              {t("cta")}
            </Link>
          </div>

          {/* Right: feature cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-primary/12 bg-primary/[0.04] p-5 transition-colors hover:border-primary/25"
              >
                <div className="mb-3 text-[22px] leading-none">{icon}</div>
                <h3 className="mb-1.5 text-[14px] font-bold text-white">
                  {title}
                </h3>
                <p className="text-[13px] leading-relaxed text-slate-400">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CloudSpotlight;
