import Image from "next/image";
import Link from "next/link";
import SectionTitle from "../Common/SectionTitle";

const AboutSectionTwo = () => {
  return (
    <section className="py-16 md:py-20 lg:py-28">
      <div className="container">
        <div className="-mx-4 flex flex-wrap items-center">
          
          {/* Sekcja Obrazka */}
          <div className="w-full px-4 lg:w-1/2">
            <div
              className="wow fadeInUp relative mx-auto mb-12 aspect-[25/24] max-w-[500px] text-center lg:m-0"
              data-wow-delay=".15s"
            >
              <Image
                src="/images/about/pw.png"
                alt="Politechnika Warszawska - studia podyplomowe z wentylacji pożarowej i systemów oddymiania"
                fill
                className="mx-auto max-w-full object-contain drop-shadow-sm dark:drop-shadow-none"
              />
            </div>
          </div>

          {/* Sekcja Tekstowa */}
          <div className="w-full px-4 lg:w-1/2">
            <SectionTitle
              title="Branżowe wykształcenie"
              paragraph="Jestem absolwentem Szkoły Głównej Służby Pożarnicznej (obecnie Akademia Pożarnicza), gdzie zdobyłem wykształcenie inżynierskie i magisterskie z dziedziny inżynierii bezpieczeństwa oraz bezpieczeństwa pożarowego. Dodatkowo stale rozszerzam swoją wiedzę ekspecką z zakresu wentylacji pożarowej i systemów oddymiania budynków na Politechnice Warszawskiej."
              mb="44px"
            />
            
            <div className="wow fadeInUp max-w-[470px]" data-wow-delay=".2s">
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                  Szkoła Główna Służby Pożarniczej
                </h3>
                <p className="text-base font-medium leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg sm:leading-relaxed">
                  Absolwent studiów I stopnia na kierunku Inżynieria Bezpieczeństwa Pożarowego. <br />
                  Absolwent studiów II stopnia na kierunku Inżynieria Bezpieczeństwa.
                </p>
              </div>

              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                  Politechnika Warszawska
                </h3>
                <p className="text-base font-medium leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg sm:leading-relaxed">
                  Studia podyplomowe z zakresu wentylacji pożarowej i systemów oddymiania budynków.
                </p>
                

              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 border-t border-slate-200 dark:border-slate-700/50 pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              Masz projekt do omówienia?
            </h3>
            <p className="mb-8 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              Chętnie przeanalizuję Twój obiekt i zaproponuję optymalne rozwiązanie — od obliczeń analitycznych
              po weryfikację CFD. Pierwsze zapytanie bez zobowiązań.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/kontakt"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Napisz do mnie
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/narzedzia/kalkulatory/cnbop"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:text-primary transition-colors"
              >
                Wypróbuj kalkulator CNBOP
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutSectionTwo;
