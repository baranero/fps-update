import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Symulacje CFD – Warszawa, Łódź, Grodzisk Mazowiecki",
  description:
    "Profesjonalne symulacje CFD (Computational Fluid Dynamics) – Warszawa, Łódź, Grodzisk Mazowiecki. Sprawdź, kiedy są wymagane i ile kosztują.",
  alternates: {
    canonical: "https://fp-solutions.pl/cfd",
  },
  openGraph: {
    title: "Symulacje CFD – Warszawa i Łódź",
    description:
      "Analiza przepływu dymu i powietrza – wentylacja pożarowa, oddymianie, ewakuacja. Koszt i wymagania dla CFD. Realizacja: Warszawa, Łódź, mazowieckie i łódzkie.",
    url: "https://fp-solutions.pl/cfd",
  },
};

const CFD = () => {
  return (
    <>
      <Breadcrumb pageName="Symulacje CFD" description="Profesjonalne analizy przepływu dymu i powietrza w warunkach pożarowych – Warszawa, Łódź, Grodzisk Mazowiecki i cała Polska"
      />

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
                  alt="Symulacja CFD Warszawa"
                  fill
                  className="rounded-md object-contain drop-shadow-three dark:hidden dark:drop-shadow-none"
                />
                <Image
                  src="/images/cfd.png"
                  alt="Symulacja CFD Warszawa"
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
                    Kiedy wymagana jest symulacja CFD?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Symulacje CFD są wymagane m.in. w obiektach wysokich,
                    garażach podziemnych, tunelach oraz tam, gdzie stosuje się
                    systemy oddymiania mechanicznego lub planuje niestandardowe
                    scenariusze ewakuacyjne. Wymagania te mogą wynikać z przepisów,
                    zaleceń rzeczoznawcy ppoż. lub indywidualnych analiz ryzyka.
                  </p>
                </div>
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Ile kosztuje symulacja CFD?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Koszt symulacji CFD zależy od złożoności obiektu, liczby scenariuszy oraz oczekiwanego zakresu opracowania. Średnie ceny zaczynają się od kilku tysięcy złotych – każda wycena przygotowywana jest indywidualnie. Zapraszam do kontaktu w celu otrzymania oferty.
                  </p>
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
                </div>
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Praca zgodna z normami i wytycznymi
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wykonując symulację w 100% trzymam się założeń przyjętych w
                    projekcie lub koncepcji. Uwzględniam wszystkie czynniki
                    środowiskowe, które mogą mieć wpływ na wyniki analizy.
                    Znajomość norm i wytycznych jest kluczowa w prawidłowym
                    opracowaniu symulacji.
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      CNBOP-PIB-0003:2016 – krajowe wytyczne dla oddymiania klatek schodowych,
                    </li>
                    <li className="list-disc">
                      PN-EN 12101-13:2022 – systemy różnicowania ciśnień (SRC),
                    </li>
                    <li className="list-disc">
                      ITB 378/2002 – wentylacja pożarowa dróg ewakuacyjnych,
                    </li>
                    <li className="list-disc">
                      NFPA 92, NFPA 204, VdS 2221, BS 7346-4 i inne.
                    </li>
                  </ul>
                </div>
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Działam lokalnie i zdalnie
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Realizuję symulacje CFD w <strong>Warszawie</strong>, <strong>Łodzi</strong>, <strong>Grodzisku Mazowieckim</strong> oraz na terenie całego <strong>województwa mazowieckiego i łódzkiego</strong>. Współpracuję również zdalnie z klientami z całej Polski.
                  </p>
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
