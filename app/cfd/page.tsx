import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";

import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Fire Protection Solutions",
  description: "Profesjonalne usługi z zakresu ochrony ppoż.",
  // other metadata
};

const CFD = () => {
  return (
    <>
      <Breadcrumb pageName="Symulacje CFD" description="" />

      <section className="py-16 md:py-20 lg:py-28">
        <div className="container">
          <div className="-mx-4 flex flex-wrap items-start">
            <div className="w-full px-4 lg:w-1/2">
              <div
                className="wow fadeInUp  relative mx-auto mb-12 aspect-[25/24] max-w-[500px] text-center lg:m-0"
                data-wow-delay=".15s"
              >
                <Image
                  src="/images/cfd.png"
                  alt="cfd"
                  fill
                  className="rounded-md object-contain drop-shadow-three dark:hidden dark:drop-shadow-none"
                />
                <Image
                  src="/images/cfd.png"
                  alt="cfd"
                  fill
                  className="hidden rounded-md object-contain drop-shadow-three dark:block dark:drop-shadow-none"
                />
              </div>
            </div>
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Symulacje CFD"
                paragraph="Symulacje CFD (Computational Fluid Dynamics) to zaawansowane analizy komputerowe, które pozwalają na modelowanie przepływu powietrza, dymu oraz rozkładu temperatury w różnych warunkach pożarowych. Dzięki nim można dokładnie przewidzieć zachowanie się gazów pożarowych, skuteczność systemów oddymiania oraz warunki ewakuacji, co znacząco zwiększa bezpieczeństwo budynków i ich użytkowników."
                mb="44px"
              />
              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Profesjonalne symulacje CFD
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Oferuję zaawansowane symulacje CFD (Computational Fluid
                    Dynamics) w zakresie wentylacji pożarowej, wykorzystując
                    profesjonalne oprogramowanie PyroSim, Pathfinder i Ventus.
                    Moje usługi są skierowane do:
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      Rzeczoznawców ds. zabezpieczeń przeciwpożarowych,
                    </li>
                    <li className="list-disc">
                      Projektantów systemów wentylacji i ochrony ppoż.,
                    </li>
                    <li className="list-disc">
                      Biur projektowych i architektonicznych,
                    </li>
                    <li className="list-disc">Biegłych sądowych.</li>
                  </ul>
                </div>
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dlaczego warto wykonać symulację CFD?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Symulacje CFD pozwalają na precyzyjną analizę
                    rozprzestrzeniania się dymu, temperatury oraz skuteczności
                    systemów wentylacyjnych i oddymiających. Dzięki nim można:
                  </p>

                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      Ocenić skuteczność systemów oddymiania w budynkach,
                    </li>
                    <li className="list-disc">
                      Zweryfikować scenariusze ewakuacji w warunkach pożaru,
                    </li>
                    <li className="list-disc">
                      Optymalizować układ wentylacji pod kątem bezpieczeństwa,
                    </li>
                    <li className="list-disc">
                      Spełnić wymagania normatywne i prawne.
                    </li>
                  </ul>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wykorzystanie symulacji na etapie projektu i koncepcji
                    systemów oddymiania pozwala na weryfikację założeń
                    projektowych i ewentualną eliminację błędów bądź
                    optymalizację jeszcze przed rozpoczęciem prac budowlanych,
                    co w procesie inwestycyjnym potrafi zaoszczędzić wielu
                    problemów.
                  </p>
                </div>
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Praca zgodna z normami i wytycznymi
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wykonując symulację w 100% trzymam się założeń przyjętych w
                    projekcie lub koncpecji. Uwzględniam wszystkie czynniki
                    środowiskowe, które mogą mieć wpływ na wyniki analizy.
                    Znajomość norm i wytycznych jest kluczowa w prawidłowym
                    opracowaniu symulacji.
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      CNBOP-PIB-0003:2016 – Krajowe wytyczne dotyczące
                      projektowania systemów oddymiania klatek schodowych,
                    </li>
                    <li className="list-disc">
                      PN-B-02877-4:2001+Az1:2006 Ochrona przeciwpożarowa
                      budynków. Instalacja grawitacyjna do odprowadzania dymu i
                      ciepła. Zasady projektowania.
                    </li>
                    <li className="list-disc">
                    PN-EN 12101-13:2022-09 Systemy kontroli rozprzestrzeniania dymu i ciepła -- Część 13: Systemy różnicowania ciśnień (SRC) -- Projektowanie i metody obliczeniowe, instalowanie, badania okresowe i konserwacja
                    </li>
                    <li className="list-disc">
                    ITB nr 378/2002 Projektowanie instalacji wentylacji pożarowej dróg
ewakuacyjnych w budynkach wysokich i wysokościowych
                    </li>

                    <li className="list-disc">
                      NFPA 92 Standard for Smoke management Systems in Malls
                    </li>
                    <li className="list-disc">
                      NFPA 204 Standard for Smoke and Heat Venting (National
                      Fire Protection Association)
                    </li>

                    <li className="list-disc">
                      VdS 2221:2007-06 VdS Richlinien fur Entrauchungsanlagen in
                      Treppenraumen (ETA) – Planung und Einbau (Urządzenia do
                      oddymiania klatek schodowych. Projektowanie i
                      instalowanie).
                    </li>

                    <li className="list-disc">
                      BS 7346-4: 2003 Components for smoke and heat control
                      systems. Part 4: Functional recommendations and
                      calculation methods for smoke and heat exhaust ventilation
                      systems, employing steady- state design fires-Code of
                      practice.
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Optymalizacja projektów pod kątem bezpieczeństwa i zgodności
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Dzięki symulacjom CFD możliwe jest nie tylko spełnienie
                    obowiązujących norm, ale także poprawa efektywności
                    działania systemów wentylacyjnych. To kluczowe w
                    projektowaniu:
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      Systemów oddymiania w budynkach PM oraz ZL,
                    </li>
                    <li className="list-disc">
                      Wentylacji garaży podziemnych i tuneli,
                    </li>
                    <li className="list-disc">
                      Ewakuacji w budynkach wysokościowych,
                    </li>
                    <li className="list-disc">
                      Systemów wspomagających akcje ratownicze.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default CFD;
