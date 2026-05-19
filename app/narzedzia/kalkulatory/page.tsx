import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalkulatory PPOŻ | Fire Protection Solutions",
  description: "Profesjonalne kalkulatory inżynierskie do projektowania systemów ochrony przeciwpożarowej.",
};

<<<<<<< HEAD
const available = [
  {
    id: "cnbop",
    href: "/narzedzia/kalkulatory/cnbop",
    title: "Kalkulator CNBOP-PIB W-0003:2016",
    subtitle: "Klatki schodowe — wizard 5-krokowy",
    description:
      "Kompleksowy kalkulator prowadzący przez cały proces projektowy systemów oddymiania klatek schodowych. Obsługuje grawitacyjne i mechaniczne, dobór klap z katalogów producentów, weryfikację napowietrzania. Eksport PDF i DOCX.",
    tags: ["CNBOP-PIB W-0003:2016", "Grawitacyjne", "Mechaniczne", "Katalogi producentów"],
    color: "purple",
    badge: "Wizard",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
=======
const calculators = [
  {
    id: "cnbop",
    title: "Kalkulator CNBOP-PIB W-0003:2016 (Wizard)",
    description: "Kompleksowy interaktywny kalkulator z multikrokowymi wytycznymi do projektowania systemów oddymiania klatek schodowych. Obsługuje zarówno oddymianie grawitacyjne, jak i systemy z nawiewem mechanicznym.",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    ),
    colorClass: "bg-purple-600 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
  },
  {
    id: "oddymianie-klatek-pn",
    title: "Klatki Schodowe (PN-B-02877-4:2025)",
    description: "Kalkulator oddymiania grawitacyjnego klatek schodowych oparty o zasady normy PN-B-02877-4. Elastyczny algorytm wyznaczający A_cz, pow. geometryczną klap oraz wymogi napływu kompensacyjnego.",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    ),
    colorClass: "bg-teal-600 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
>>>>>>> 90d59143e76369e72e6104e5d3a72020759e31cd
  },
  {
    id: "oddymianie-klatek-pn",
    href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
    title: "Klatki schodowe PN-B-02877-4:2025",
    subtitle: "Oddymianie grawitacyjne",
    description:
      "Wyznaczanie wymaganej pow. czynnej klap dymowych (A_cz), powierzchni geometrycznej oraz wymogów napływu kompensacyjnego zgodnie z normą PN-B-02877-4:2025.",
    tags: ["PN-B-02877-4", "Klatki schodowe", "Grawitacyjne", "Napowietrzanie"],
    color: "teal",
    badge: null,
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "oddymianie-grawitacyjne",
    href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
    title: "Oddymianie grawitacyjne — szybki",
    subtitle: "PN / CNBOP / VdS",
    description:
      "Uproszczony kalkulator szybkiego doboru klap dymowych według trzech norm projektowych. Bez prowadzenia krok po kroku — wpisz powierzchnię i wysokość, odczytaj wymaganą A_cz.",
    tags: ["PN", "CNBOP", "VdS", "Szybki dobór"],
    color: "blue",
    badge: null,
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const soon = [
  {
    title: "Gęstość obciążenia ogniowego",
    subtitle: "PN-B-02852",
    description: "Wyznaczanie gęstości obciążenia ogniowego (Q) dla strefy pożarowej na podstawie masy materiałów palnych i ich ciepła spalania.",
    tags: ["PN-B-02852", "Strefa pożarowa"],
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
  {
    title: "Podręczny sprzęt gaśniczy",
    subtitle: "Dobór ilościowy wg rozporządzenia",
    description: "Kalkulator minimalnej wymaganej masy środka gaśniczego oraz liczby gaśnic dla danego obiektu.",
    tags: ["Gaśnice", "Rozporządzenie MSW"],
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Wentylacja pożarowa",
    subtitle: "Wydatek objętościowy i masowy",
    description: "Szacowanie wydatków dla systemów oddymiania mechanicznego dróg ewakuacyjnych i garaży podziemnych.",
    tags: ["Garaże", "Drogi ewakuacyjne", "Oddymianie mech."],
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
      </svg>
    ),
  },
];

const colorMap: Record<string, { ring: string; icon: string; badge: string }> = {
  purple: {
    ring: "border-purple-100 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700",
    icon: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  teal: {
    ring: "border-teal-100 dark:border-teal-900/30 hover:border-teal-300 dark:hover:border-teal-700",
    icon: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
  blue: {
    ring: "border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
};

export default function CalculatorsPage() {
  return (
    <div className="space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">Kalkulatory</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Wszystkie algorytmy opierają się na aktualnych normach i wytycznych. Każde obliczenie możesz wyeksportować do PDF lub DOCX.
        </p>
      </div>

      {/* Available */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Dostępne</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {available.map((calc) => {
            const c = colorMap[calc.color];
            return (
              <Link
                key={calc.id}
                href={calc.href}
                className={`group flex flex-col rounded-2xl border bg-white dark:bg-[#111827] p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${c.ring}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.icon}`}>
                    {calc.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    {calc.badge && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${c.badge}`}>
                        {calc.badge}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Dostępny
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-0.5">
                  {calc.title}
                </h3>
                <p className="text-xs font-semibold text-slate-400 mb-3">{calc.subtitle}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                  {calc.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {calc.tags.map(tag => (
                    <span key={tag} className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Uruchom kalkulator</span>
                  <svg className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {soon.map((calc, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-5 opacity-60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600">
                  {calc.icon}
                </div>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">
                  Wkrótce
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 leading-snug mb-0.5">
                {calc.title}
              </h3>
              <p className="text-xs font-semibold text-slate-400 mb-3">{calc.subtitle}</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 leading-relaxed flex-1">
                {calc.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {calc.tags.map(tag => (
                  <span key={tag} className="rounded-md bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
