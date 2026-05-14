import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { 
  title: "Kalkulatory PPOŻ | Fire Protection Solutions",
  description: "Zestaw profesjonalnych kalkulatorów inżynierskich do projektowania zabezpieczeń przeciwpożarowych.",
};

const calculators = [
  {
    id: "cnbop",
    title: "Klatki Schodowe - (CNBOP-PIB W-0003:2016)",
    description: "Zautomatyzowane narzędzie do weryfikacji wymogów i obliczania parametrów systemów oddymiania (grawitacyjnych i mechanicznych) dla klatek schodowych wg CNBOP-PIB W-0003:2016 wydanie 2, maj 2019.",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
    ),
    colorClass: "bg-primary text-primary group-hover:bg-primary group-hover:text-white",
  },
  {
    id: "obciazenie-ogniowe",
    title: "Gęstość obciążenia ogniowego (PN-B-02852)",
    description: "Wyznacz gęstość obciążenia ogniowego (Q) dla strefy pożarowej na podstawie masy materiałów palnych i ich ciepła spalania.",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
    ),
    colorClass: "bg-orange-500 text-orange-500 group-hover:bg-orange-500 group-hover:text-white",
  },
  {
    id: "sprzet-gasniczy",
    title: "Dobór podręcznego sprzętu gaśniczego",
    description: "Kalkulator minimalnej wymaganej masy środka gaśniczego oraz liczby gaśnic dla danego obiektu zgodnie z rozporządzeniem.",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" /></svg>
    ),
    colorClass: "bg-red-600 text-red-600 group-hover:bg-red-600 group-hover:text-white",
  },
  {
    id: "wentylacja-pozarowa",
    title: "Wydatek wentylacji pożarowej",
    description: "Szacowanie wydatków objętościowych i masowych dla systemów oddymiania mechanicznego dróg ewakuacyjnych i garaży.",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
    ),
    colorClass: "bg-blue-500 text-blue-500 group-hover:bg-blue-500 group-hover:text-white",
  },
];

export default function CalculatorsPage() {
  return (
    <div className="space-y-8">
      
      {/* Nagłówek sekcji kalkulatorów */}
      <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-4 text-2xl font-bold text-black dark:text-white sm:text-3xl">
              Kalkulatory Inżynierskie
            </h1>
            <p className="text-base font-medium leading-relaxed text-body-color dark:text-body-color-dark">
              Wybierz moduł obliczeniowy z poniższej listy. Wszystkie algorytmy opierają się na aktualnych wytycznych i normach. Możesz wygenerować raport PDF z każdego obliczenia.
            </p>
          </div>
        </div>
      </div>

      {/* Siatka kalkulatorów */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
        {calculators.map((calc) => (
          <div 
            key={calc.id} 
            className="group flex flex-col justify-between rounded-md bg-white p-6 shadow-two transition-all duration-300 hover:shadow-lg dark:bg-dark sm:p-8"
          >
            <div>
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-opacity-10 transition-colors ${calc.colorClass}`}>
                {calc.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold text-black dark:text-white">
                {calc.title}
              </h3>
              <p className="mb-6 text-base font-medium leading-relaxed text-body-color dark:text-body-color-dark">
                {calc.description}
              </p>
            </div>
            
            <div>
              <Link
                href={`/narzedzia/kalkulatory/${calc.id}`}
                className="inline-flex items-center text-sm font-bold text-primary transition-colors hover:underline"
              >
                Uruchom kalkulator
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}