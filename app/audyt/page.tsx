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

const audyt = () => {
  return (
    <>
      <Breadcrumb pageName="Audyt ppoż." description="" />

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
                  className="rounded-md object-cover drop-shadow-three dark:hidden dark:drop-shadow-none"
                />
                <Image
                  src="/images/operat.jpg"
                  alt="cfd"
                  fill
                  className="hidden rounded-md object-cover drop-shadow-three dark:block dark:drop-shadow-none"
                />
              </div>
            </div>
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Operat przeciwpożarowy"
                paragraph="Operat ppoż. jest dokumentem koniecznym do wydania pozwolenia na zbieranie, przetwarzanie i/lub wytwarzanie odpadów. Stanowi załącznik do ww. wniosku. Określa i opiniuje zgodność warunków w jakim są magazynowane odpady z przepisami z zakresu ochrony przeciwpożarowej."
                mb="44px"
              />
              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Operat przeciwpożarowy - kiedy wymagany?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Inwestor, który ubiega się o wydanie pozwolenia na
                    zbieranie, przetwarzanie, bądź wytwarzanie odpadów
                    zobligowany jest do posiadania operatu ppoż., który dołączy
                    jako załącznik do wniosku.
                  </p>
                </div>
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kto może sporządzić operat ppoż.?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Gdy organem właściwym jest marszałek województwa albo
                    regionalny dyrektor ochrony środowiska:
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      rzeczoznawca do spraw zabezpieczeń przeciwpożarowych, o
                      którym mowa w rozdziale 2a ustawy z dnia 24 sierpnia 1991
                      r. o ochronie przeciwpożarowej (Dz.U. 2025 poz. 188)
                    </li>
                  </ul>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Gdy organem właściwym jest starosta:
                  </p>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      inżynier pożarnictwa, magister inżynier pożarnictwa albo
                      tytuł zawodowy inżynier i dyplom ukończenia w Szkole
                      Głównej Służby Pożarniczej studiów w zakresie inżynierii
                      bezpieczeństwa w specjalności inżynieria bezpieczeństwa
                      pożarowego wydany do dnia 30 września 2019 r. lub studiów
                      na kierunku inżynieria bezpieczeństwa w zakresie
                      inżynieria bezpieczeństwa pożarowego wydany po dniu 30
                      września 2019 r. lub dyplom ukończenia w Akademii
                      Pożarniczej studiów na kierunku inżynieria bezpieczeństwa
                      w zakresie inżynieria bezpieczeństwa pożarowego, o którym
                      mowa w art. 4 ust. 2a ustawy z dnia 24 sierpnia 1991 r. o
                      ochronie przeciwpożarowej (Dz.U. 2025 poz. 188)
                    </li>
                  </ul>
                </div>
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Podstawa prawna
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Ustawa z dnia 14 grudnia 2012 r. o odpadach (Dz.U. 2023 poz.
                    1587 z późniejszym zmianami)
                  </p>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Ustawa z dnia 27 kwietnia 2001 r. - Prawo ochrony środowiska
                    (Dz.U. 2024 poz. 54 z późniejszymi zmianami)
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

export default audyt;
