import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Symulacje CFD | Inżynieria Bezpieczeństwa Pożarowego – Warszawa, Łódź",
  description:
    "Profesjonalne symulacje CFD (Computational Fluid Dynamics) z zakresu inżynierii bezpieczeństwa pożarowego – Warszawa, Łódź, Grodzisk Mazowiecki. Sprawdź, kiedy są wymagane i ile kosztują.",
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

const CfdPage = () => {
  return (
    <>
      <Breadcrumb 
        pageName="Symulacje CFD" 
        description="Profesjonalne analizy przepływu dymu i powietrza w warunkach pożarowych – ekspercka inżynieria bezpieczeństwa pożarowego dla Warszawy, Łodzi i całej Polski."
      />

      <section className="py-16 md:py-20 lg:py-28">
        <div className="container">
          <div className="-mx-4 flex flex-wrap items-start">
            
            {/* Sekcja Obrazka */}
            <div className="w-full px-4 lg:w-1/2">
              <div
                className="wow fadeInUp relative mx-auto mb-12 aspect-[25/24] max-w-[500px] text-center lg:m-0"
                data-wow-delay=".15s"
              >
                <Image
                  src="/images/cfd.png"
                  alt="Komputerowa symulacja CFD przepływu dymu i ciepła"
                  fill
                  className="rounded-md object-contain drop-shadow-three dark:drop-shadow-none"
                />
              </div>
            </div>

            {/* Sekcja Treści */}
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Symulacje CFD"
                paragraph="Symulacje CFD (Computational Fluid Dynamics) to zaawansowane analizy komputerowe z zakresu inżynierii bezpieczeństwa pożarowego, które pozwalają na modelowanie przepływu powietrza, dymu oraz rozkładu temperatury w różnych warunkach pożarowych. Dzięki nim można dokładnie przewidzieć zachowanie się gazów pożarowych, skuteczność systemów oddymiania oraz warunki ewakuacji, co znacząco zwiększa bezpieczeństwo budynków."
                mb="44px"
              />
              
              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Profesjonalne symulacje CFD
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Oferuję zaawansowane symulacje CFD w zakresie wentylacji pożarowej, wykorzystując
                    profesjonalne oprogramowanie inżynieryjne takie jak PyroSim, Pathfinder i Ventus.
                    Moje usługi są skierowane w szczególności do:
                  </p>
                  <ul className="mt-3 pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">Rzeczoznawców ds. zabezpieczeń przeciwpożarowych</li>
                    <li className="list-disc">Projektantów systemów wentylacji i inżynierów ochrony ppoż.</li>
                    <li className="list-disc">Biur projektowych i architektonicznych</li>
                    <li className="list-disc">Biegłych sądowych</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kiedy wymagana jest symulacja CFD?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Symulacje CFD są wymagane m.in. w obiektach wysokich i wysokościowych,
                    garażach podziemnych, tunelach oraz tam, gdzie stosuje się
                    systemy oddymiania mechanicznego lub planuje niestandardowe
                    scenariusze ewakuacyjne. Wymagania te mogą wynikać z przepisów,
                    zaleceń rzeczoznawcy ppoż. lub indywidualnych analiz ryzyka przeprowadzanych przez inżyniera pożarnictwa.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Ile kosztuje symulacja CFD?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Koszt symulacji CFD zależy od złożoności architektonicznej obiektu, liczby scenariuszy pożarowych oraz oczekiwanego zakresu opracowania. Średnie ceny zaczynają się od kilku tysięcy złotych – każda wycena przygotowywana jest indywidualnie na podstawie rzutów i specyfikacji.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dlaczego warto wykonać symulację CFD?
                  </h3>
                  <p className="mb-3 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Symulacje CFD pozwalają na precyzyjną analizę
                    rozprzestrzeniania się dymu, temperatury oraz skuteczności
                    systemów wentylacyjnych i oddymiających. Dzięki nim można:
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">Ocenić skuteczność systemów oddymiania w budynkach</li>
                    <li className="list-disc">Zweryfikować scenariusze ewakuacji w warunkach pożaru</li>
                    <li className="list-disc">Optymalizować układ wentylacji pod kątem bezpieczeństwa i kosztów wykonania</li>
                    <li className="list-disc">Spełnić rygorystyczne wymagania normatywne i prawne</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Praca zgodna z normami i wytycznymi
                  </h3>
                  <p className="mb-3 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wykonując symulację, w 100% trzymam się założeń przyjętych w
                    projekcie budowlanym lub koncepcji. Uwzględniam wszystkie czynniki
                    środiskowe wpływające na wynik analizy.
                    Opieram się na kluczowych normach inżynierskich:
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">CNBOP-PIB-0003:2016 – wytyczne dla oddymiania klatek schodowych</li>
                    <li className="list-disc">PN-EN 12101-13:2022 – systemy różnicowania ciśnień (SRC)</li>
                    <li className="list-disc">ITB 378/2002 – wentylacja pożarowa dróg ewakuacyjnych</li>
                    <li className="list-disc">NFPA 92, NFPA 204, VdS 2221, BS 7346-4 i inne międzynarodowe standardy</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Działam lokalnie i zdalnie
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Realizuję analizy CFD w <strong>Warszawie</strong>, <strong>Łodzi</strong>, <strong>Grodzisku Mazowieckim</strong> oraz na terenie całego <strong>województwa mazowieckiego i łódzkiego</strong>. Posiadam odpowiednie zaplecze technologiczne, aby współpracować również w pełni zdalnie z biurami z całej Polski.
                  </p>
                </div>

                {/* Sekcja Call To Action (CTA) */}
                <div className="mt-8 rounded-sm border-l-4 border-primary bg-primary/5 p-6">
                  <p className="text-base font-bold leading-relaxed text-black dark:text-white sm:text-lg sm:leading-relaxed">
                    Potrzebujesz profesjonalnej symulacji CFD? Skontaktuj się ze mną, aby omówić projekt i otrzymać darmową wycenę dostosowaną do Twojego obiektu.
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

export default CfdPage;