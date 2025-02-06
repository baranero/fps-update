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

const operat = () => {
  return (
    <>
      <Breadcrumb
        pageName="Operat ppoż."
        description=""
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
                src="/images/operat.jpg"
                alt="cfd"
                fill
                className="drop-shadow-three dark:hidden dark:drop-shadow-none object-cover rounded-md"
              />
              <Image
                src="/images/operat.jpg"
                alt="cfd"
                fill
                className="drop-shadow-three hidden dark:block dark:drop-shadow-none object-cover rounded-md"
              />
            </div>
          </div>
          <div className="w-full px-4 lg:w-1/2">
          <SectionTitle
                title="Operat przeciwpożarowy"
                paragraph="Symulacje CFD (Computational Fluid Dynamics) to zaawansowane analizy komputerowe, które pozwalają na modelowanie przepływu powietrza, dymu oraz rozkładu temperatury w różnych warunkach pożarowych. Dzięki nim można dokładnie przewidzieć zachowanie się gazów pożarowych, skuteczność systemów oddymiania oraz warunki ewakuacji, co znacząco zwiększa bezpieczeństwo budynków i ich użytkowników."
                mb="44px"
              />
            <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Profesjonalne symulacje CFD
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Oferuję zaawansowane symulacje CFD (Computational Fluid Dynamics) w zakresie wentylacji pożarowej, wykorzystując profesjonalne oprogramowanie PyroSim, Pathfinder i Ventus. Moje usługi są skierowane do:
                </p>
                <ul className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed pl-5">
    <li className="list-disc">Rzeczoznawców ds. zabezpieczeń przeciwpożarowych</li>
    <li className="list-disc">Projektantów systemów wentylacji i ochrony ppoż.</li>
    <li className="list-disc">Biur projektowych i architektonicznych</li>
    <li className="list-disc">Biegłych sądowych</li>
</ul>
              </div>
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Dlaczego warto wykonać symulację CFD?
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Symulacje CFD pozwalają na precyzyjną analizę rozprzestrzeniania się dymu, temperatury oraz skuteczności systemów wentylacyjnych i oddymiających. Dzięki nim można:</p>

<ul className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed pl-5">
    <li className="list-disc">Ocenić skuteczność systemów oddymiania w budynkach</li>
    <li className="list-disc">Zweryfikować scenariusze ewakuacji w warunkach pożaru</li>
    <li className="list-disc">Optymalizować układ wentylacji pod kątem bezpieczeństwa</li>
    <li className="list-disc">Spełnić wymagania normatywne i prawne</li>
</ul>
                
              </div>
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Praca zgodna z normami i wytycznymi
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Analizy są wykonywane w oparciu o wytyczne i normy obowiązującymi w Unii Europejskiej oraz na świecie:
                </p>
                <ul className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed pl-5">
    <li className="list-disc">CNBOP – Krajowe wytyczne dotyczące projektowania systemów oddymiania klatek schodowych</li>
    <li className="list-disc">NFPA (National Fire Protection Association) – Amerykańskie normy ochrony przeciwpożarowej</li>
    <li className="list-disc">British Standard (BS) – Brytyjskie regulacje dla systemów wentylacyjnych</li>
    <li className="list-disc">Polskie Normy (PN) – Normy obowiązujące w projektowaniu systemów oddymiających</li>
</ul>
              </div>

              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Optymalizacja projektów pod kątem bezpieczeństwa i zgodności
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Dzięki symulacjom CFD możliwe jest nie tylko spełnienie obowiązujących norm, ale także poprawa efektywności działania systemów wentylacyjnych. To kluczowe w projektowaniu:
                </p>
<ul className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed pl-5">
    <li className="list-disc">Systemów oddymiania w budynkach PM oraz ZL</li>
    <li className="list-disc">Wentylacji garaży podziemnych i tuneli</li>
    <li className="list-disc">Ewakuacji w budynkach wysokościowych</li>
    <li className="list-disc">Systemów wspomagających akcje ratownicze</li>
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

export default operat;
