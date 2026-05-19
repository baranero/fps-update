import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Inżyniera | Fire Protection Solutions",
  description: "Zaawansowane narzędzia obliczeniowe dla profesjonalistów ochrony przeciwpożarowej.",
};

const featured = {
  id: "cnbop",
  href: "/narzedzia/kalkulatory/cnbop",
  title: "Kalkulator CNBOP-PIB W-0003:2016",
  subtitle: "Klatki schodowe — wizard 5-krokowy",
  description:
    "Najbardziej rozbudowany kalkulator w zestawie. Prowadzi przez cały proces projektowy: od charakterystyki budynku, przez dobór klap z katalogów producentów (Gulajski, ASKON, AWAK), po weryfikację napowietrzania i symulację CFD. Generuje raport PDF i DOCX.",
  features: ["Grawitacyjne i mechaniczne", "Dobór klap z katalogów", "Weryfikacja napowietrzania", "Raport PDF / DOCX"],
};

const tools = [
  {
    id: "cnbop",
    href: "/narzedzia/kalkulatory/cnbop",
    title: "CNBOP W-0003:2016",
    subtitle: "Wizard 5-krokowy",
    tags: ["Klatki schodowe", "Grawitacyjne", "Mechaniczne"],
    color: "purple",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: "oddymianie-klatek-pn",
    href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
    title: "Klatki schodowe PN-B",
    subtitle: "PN-B-02877-4:2025",
    tags: ["Klatki schodowe", "Grawitacyjne"],
    color: "teal",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "oddymianie-grawitacyjne",
    href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
    title: "Oddymianie — szybki",
    subtitle: "PN / CNBOP / VdS",
    tags: ["Klapa dymowa", "Szybki dobór"],
    color: "blue",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const soonTools = [
  { title: "Gęstość obciążenia ogniowego", subtitle: "PN-B-02852" },
  { title: "Podręczny sprzęt gaśniczy", subtitle: "Dobór ilościowy" },
  { title: "Wentylacja pożarowa", subtitle: "Garaże / drogi ewakuacyjne" },
];

const colorMap: Record<string, { bg: string; icon: string; accent: string }> = {
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30",
    icon: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    accent: "text-purple-600 dark:text-purple-400",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30",
    icon: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
    accent: "text-teal-600 dark:text-teal-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    accent: "text-blue-600 dark:text-blue-400",
  },
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">Panel główny</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Narzędzia obliczeniowe dla projektantów systemów ochrony przeciwpożarowej.
        </p>
      </div>

      {/* Featured tool */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                Polecany
              </span>
              <span className="text-xs text-slate-400 font-medium">{featured.subtitle}</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">{featured.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5 max-w-xl">
              {featured.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {featured.features.map(f => (
                <span key={f} className="flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </span>
              ))}
            </div>
            <Link
              href={featured.href}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
            >
              Uruchom kalkulator
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Available tools */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Dostępne kalkulatory</h2>
          <Link href="/narzedzia/kalkulatory" className="text-xs font-bold text-primary hover:underline">
            Wszystkie →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {tools.map((tool) => {
            const c = colorMap[tool.color];
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`group rounded-2xl border p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${c.bg}`}
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.icon}`}>
                  {tool.icon}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{tool.title}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 mb-3">{tool.subtitle}</p>
                <div className="flex flex-wrap gap-1">
                  {tool.tags.map(t => (
                    <span key={t} className="rounded-md bg-white/70 dark:bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
                <div className={`mt-4 flex items-center gap-1 text-xs font-bold ${c.accent}`}>
                  Uruchom
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Coming soon */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">W przygotowaniu</h2>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] divide-y divide-slate-100 dark:divide-slate-800">
          {soonTools.map((tool, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">{tool.title}</p>
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">{tool.subtitle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                Wkrótce
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
