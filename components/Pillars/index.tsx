import Link from "next/link";

const pillars = [
  {
    icon: "🔥",
    title: "Usługi ppoż.",
    desc: "Projekty SSP, oddymiania, IBP, OZW/DZW, operaty i audyty — kompleksowa dokumentacja zgodna z polskim prawem.",
    link: "/kontakt",
    label: "Zobacz ofertę →",
    variant: "red" as const,
  },
  {
    icon: "☁",
    title: "CFD Cloud",
    desc: "Wgraj plik FDS, odbierz wyniki symulacji. Bez własnego serwera — obliczenia w chmurze, płatność od zużycia.",
    link: "/symulacje",
    label: "Uruchom symulację →",
    variant: "cloud" as const,
  },
  {
    icon: "🧮",
    title: "Narzędzia projektowe",
    desc: "Kalkulatory CNBOP, oddymiania klatek i grawitacyjnego. Raporty w PDF i DOCX. Dostęp po rejestracji.",
    link: "/narzedzia/kalkulatory",
    label: "Przejdź do narzędzi →",
    variant: "neutral" as const,
  },
];

const Pillars = () => {
  return (
    <section className="border-b border-slate-200/60 py-16 dark:border-slate-800/60">
      <div className="container">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Czym się zajmujemy
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pillars.map(({ icon, title, desc, link, label, variant }) => (
            <Link
              key={title}
              href={link}
              className={`group relative rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-0.5 ${
                variant === "cloud"
                  ? "border-primary/25 bg-primary/[0.04] hover:border-primary/40 hover:bg-primary/[0.07]"
                  : variant === "red"
                  ? "border-slate-200 bg-white hover:border-primary/30 dark:border-slate-700/60 dark:bg-slate-800/30 dark:hover:border-primary/30"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700/60 dark:bg-slate-800/30 dark:hover:border-slate-600"
              }`}
            >
              <div
                className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl border text-xl ${
                  variant === "cloud"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-primary/20 bg-primary/8 text-primary"
                }`}
              >
                {icon}
              </div>
              <h3
                className={`mb-2 text-[17px] font-bold ${
                  variant === "cloud"
                    ? "text-primary"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {title}
              </h3>
              <p className="mb-5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                {desc}
              </p>
              <span
                className={`text-[13px] font-semibold ${
                  variant === "cloud"
                    ? "text-primary"
                    : "text-primary"
                }`}
              >
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pillars;
