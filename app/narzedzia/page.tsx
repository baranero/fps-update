import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Narzędzia | Fire Protection Solutions",
  description: "Kalkulatory inżynierskie dla projektantów systemów PPOŻ.",
};

const calculators = [
  {
    id: "cnbop",
    href: "/narzedzia/kalkulatory/cnbop",
    norm: "CNBOP-PIB W-0003:2016",
    title: "Kalkulator klatek schodowych",
    desc: "Dobór klap dymowych: dane budynku → obliczenia → katalogi Gulajski / ASKON / AWAK → napowietrzanie → raport.",
    tag: "5 kroków",
  },
  {
    id: "pn-klatki",
    href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
    norm: "PN-B-02877-4:2025",
    title: "Klatki schodowe — PN",
    desc: "Wymagana Aᴄz i weryfikacja napowietrzania według aktualnej normy polskiej.",
    tag: null,
  },
  {
    id: "szybki-acz",
    href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
    norm: "PN / CNBOP / VdS",
    title: "Szybki dobór Aᴄz",
    desc: "Powierzchnia strefy i wysokość → wymagana Aᴄz według trzech norm jednocześnie.",
    tag: null,
  },
];

const soon = [
  { norm: "PN-B-02852", title: "Gęstość obciążenia ogniowego" },
  { norm: "Rozp. MSW", title: "Podręczny sprzęt gaśniczy" },
  { norm: "—", title: "Wentylacja pożarowa — garaże" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">

      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Narzędzia</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Kalkulatory i symulacje dla projektantów systemów oddymiania.
        </p>
      </div>

      {/* Symulacje — promowane */}
      <Link
        href="/narzedzia/symulacje"
        className="group block rounded-md bg-slate-900 dark:bg-[#0D1117] px-6 py-6 hover:bg-slate-800 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="font-mono text-[11px] font-semibold text-slate-400 tracking-wide">FDS / CFD</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary border border-primary/40 rounded px-1.5 py-0.5">Nowe</span>
            </div>
            <h2 className="text-base font-semibold text-white mb-2">
              Symulacje numeryczne
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              Obliczenia Fire Dynamics Simulator w chmurze — bez lokalnej instalacji, bez konfiguracji serwera.
              Wgrywasz plik <code className="text-slate-300 font-mono">.fds</code>, dostajesz wyniki.
            </p>
          </div>
          <svg
            className="h-5 w-5 shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Kalkulatory */}
      <div>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">Kalkulatory</p>
        <div className="grid grid-cols-1 gap-px bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden sm:grid-cols-3">
          {calculators.map((calc) => (
            <Link
              key={calc.id}
              href={calc.href}
              className="group bg-white dark:bg-[#1E232E] px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-2.5">
                <span className="font-mono text-[10px] font-semibold text-primary tracking-wide leading-tight">
                  {calc.norm}
                </span>
                {calc.tag && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 shrink-0 ml-2">
                    {calc.tag}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5 group-hover:text-primary transition-colors">
                {calc.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {calc.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* W przygotowaniu */}
      <div>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">W przygotowaniu</p>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded">
          {soon.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <span className="font-mono text-[10px] text-slate-300 dark:text-slate-600 shrink-0 w-28">{s.norm}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
