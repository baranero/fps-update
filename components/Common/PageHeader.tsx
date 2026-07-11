import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// Wspólny nagłówek podstrony w nowym języku: ślad okruszków (mono),
// tytuł w kroju display (Archivo), delikatna siatka inżynierska w tle.
// Treść pobierana z namespace `headers` po kluczu strony.

export default function PageHeader({ page }: { page: string }) {
  const t = useTranslations("headers");
  const tn = useTranslations("nav");

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0B1120]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(120,124,132,.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,124,132,.09) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,.55), transparent 85%)",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,.55), transparent 85%)",
        }}
      />
      <div className="container relative py-12 lg:py-16">
        <nav
          aria-label="breadcrumb"
          className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            {tn("home")}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-primary">{t(`${page}.crumb`)}</span>
        </nav>

        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {t(`${page}.title`)}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t(`${page}.desc`)}
        </p>
      </div>
    </section>
  );
}
