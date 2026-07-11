import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Kicker from "@/components/ui/Kicker";
import { FlameIcon, ServerIcon, GaugeIcon, ArrowRightIcon } from "@/components/ui/Icon";

const Pillars = () => {
  const t = useTranslations("pillars");

  const pillars = [
    {
      Icon: FlameIcon,
      title: t("services.title"),
      desc: t("services.desc"),
      link: "/kontakt",
      label: t("services.cta"),
      index: "01",
      featured: false,
    },
    {
      Icon: ServerIcon,
      title: t("cloud.title"),
      desc: t("cloud.desc"),
      link: "/symulacje",
      label: t("cloud.cta"),
      index: "02",
      featured: true,
    },
    {
      Icon: GaugeIcon,
      title: t("tools.title"),
      desc: t("tools.desc"),
      link: "/narzedzia/kalkulatory",
      label: t("tools.cta"),
      index: "03",
      featured: false,
    },
  ];

  return (
    <section className="border-b border-slate-200/60 py-16 dark:border-slate-800/60">
      <div className="container">
        <Kicker>{t("eyebrow")}</Kicker>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pillars.map(({ Icon, title, desc, link, label, index, featured }) => (
            <Link
              key={title}
              href={link}
              className={`group relative overflow-hidden rounded-xl border bg-white p-6 transition-colors dark:bg-slate-800/30 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:origin-top before:scale-y-0 before:bg-primary before:transition-transform before:duration-200 before:content-[''] hover:before:scale-y-100 ${
                featured
                  ? "border-primary/30 hover:border-primary/50 dark:border-primary/30"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700/60 dark:hover:border-slate-600"
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-mono text-[11px] text-slate-300 dark:text-slate-600">
                  {index}
                </span>
              </div>
              <h3 className="mb-2 font-display text-[19px] font-bold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="mb-5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                {desc}
              </p>
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-medium text-primary">
                {label}
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pillars;
