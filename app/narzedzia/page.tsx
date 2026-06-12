import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Inżyniera | Fire Protection Solutions",
  description: "Zaawansowane narzędzia obliczeniowe dla profesjonalistów ochrony przeciwpożarowej.",
};

const quickTools = [
  {
    id: "oddymianie-klatek-pn",
    href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
    title: "Klatki schodowe PN-B",
    subtitle: "PN-B-02877-4:2025",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "oddymianie-grawitacyjne",
    href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
    title: "Szybki dobór Aᴄz",
    subtitle: "PN / CNBOP / VdS",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "symulacje",
    href: "/narzedzia/symulacje",
    title: "Symulacje FDS",
    subtitle: "Obliczenia CFD w chmurze",
    badge: "Nowe",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
  },
];

const soonTools = [
  { title: "Gęstość obciążenia ogniowego", subtitle: "PN-B-02852" },
  { title: "Podręczny sprzęt gaśniczy", subtitle: "Dobór ilościowy" },
  { title: "Wentylacja pożarowa", subtitle: "Garaże / drogi ewakuacyjne" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Panel główny</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Narzędzia obliczeniowe dla projektantów systemów ochrony przeciwpożarowej.
        </p>
      </div>

      {/* Główny kalkulator */}
      <Link
        href="/narzedzia/kalkulatory/cnbop"
        className="group block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6 hover:border-primary/50 hover:shadow-md transition-all duration-200"
      >
        <div className="flex items-start gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Kalkulator CNBOP-PIB W-0003:2016</h2>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary">4 kroki</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Kompletny kalkulator klatek schodowych — od danych budynku, przez dobór klap z katalogów Gulajski / ASKON / AWAK i weryfikację napowietrzania, po gotowy raport PDF lub DOCX.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {["Grawitacyjne i mechaniczne", "Dobór klap z katalogów", "Raport PDF / DOCX"].map(f => (
                <span key={f} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <svg className="h-3.5 w-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </span>
              ))}
            </div>
          </div>
          <svg className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Pozostałe narzędzia */}
      <div>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">Pozostałe narzędzia</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickTools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 hover:border-primary/50 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {tool.icon}
                </div>
                {"badge" in tool && tool.badge && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary">{tool.badge}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{tool.title}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{tool.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* W przygotowaniu */}
      <div>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">W przygotowaniu</p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
          {soonTools.map((tool, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm text-slate-400 dark:text-slate-500">{tool.title}</p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">{tool.subtitle}</p>
              </div>
              <span className="text-xs text-slate-300 dark:text-slate-600">wkrótce</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
