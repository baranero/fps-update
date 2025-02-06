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

const IBP = () => {
  return (
    <>
      <Breadcrumb
        pageName="IBP"
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
                src="/images/ibp.jpg"
                alt="gaśnica"
                fill
                className="drop-shadow-three dark:hidden dark:drop-shadow-none object-cover rounded-md"
              />
              <Image
                src="/images/ibp.jpg"
                alt="gaśnica"
                fill
                className="drop-shadow-three hidden dark:block dark:drop-shadow-none object-cover rounded-md"
              />
            </div>
          </div>
          <div className="w-full px-4 lg:w-1/2">
          <SectionTitle
                title="Instrukcja Bezpieczeństwa Pożarowego"
                paragraph="Instrukcja Bezpieczeństwa Pożarowego (IBP) to kluczowy dokument określający zasady ochrony przeciwpożarowej w budynkach. Oferuję kompleksowe opracowanie Instrukcji Bezpieczeństwa Pożarowego, dostosowanej do specyfiki Państwa obiektu, zgodnie z najnowszymi przepisami prawa."
                mb="44px"
              />
            <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Kiedy Instrukcja Bezpieczeństwa Pożarowego jest wymagana?
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Zgodnie z prawem właściciele, zarządcy lub użytkownicy obiektów bądź ich części stanowiących odrębne strefy pożarowe, przeznaczonych do wykonywania funkcji użyteczności publicznej, zamieszkania zbiorowego, produkcyjnych, magazynowych oraz inwentarskich, zapewniają i wdrażają instrukcję bezpieczeństwa pożarowego.
                </p>
              </div>
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Kiedy Instrukcja Bezpieczeństwa Pożarowego <u>nie</u> jest wymagana?
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Instrukcja bezpieczeństwa pożarowego nie jest wymagana, gdy:</p>

<ul className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed pl-5">
    <li className="list-disc">kubatura brutto budynku lub jego części stanowiącej odrębną strefę pożarową nie przekracza 1000 m3</li>
    <li className="list-disc">kubatura brutto budynku inwentarskiego nie przekracza 1500 m3</li>
    <li className="list-disc">powierzchnia strefy pożarowej obiektu innego niż budynek nie przekracza 1000 m2</li>
</ul>
                
              </div>
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Podstawa prawna
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                §6 Rozporządzenia Ministra Spraw Wewnętrznych i Administracji z dnia 7 czerwca 2010 r. w sprawie ochrony przeciwpożarowej budynków, innych obiektów budowlanych i terenów. (Dz. U. z 2023 r., poz. 822 z późn. zm.).
                </p>
              </div>

              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                Dlaczego warto zlecić opracowanie Instrukcji Bezpieczeństwa Pożarowego mojej osobie?
                </h3>

<ul className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed pl-5">
    <li className="list-disc">Indywidualne podejście – Każdy obiekt jest inny, dlatego moja instrukcja zawsze uwzględnia specyficzne zagrożenia i potrzeby Państwa obiektu.</li>
    <li className="list-disc">Doświadczenie i wiedza – jestem ekspertem z wieloletnim doświadczeniem w branży ochrony przeciwpożarowej.</li>
    <li className="list-disc">Zgodność z przepisami – Instrukcje opracowuję zgodnie z obowiązującymi normami i przepisami, co jest kluczowe dla zgodności z wymaganiami prawnymi.</li>
    <li className="list-disc">Kompleksowe wsparcie – Oferuję nie tylko opracowanie dokumentacji, ale również doradztwo w zakresie ochrony przeciwpożarowej.</li>
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

export default IBP;
