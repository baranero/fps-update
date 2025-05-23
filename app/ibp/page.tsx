import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";

import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title:
    "Instrukcja Bezpieczeństwa Pożarowego – Warszawa, Grodzisk Mazowiecki, Łódź",
  description:
    "Opracowanie Instrukcji Bezpieczeństwa Pożarowego (IBP) dla obiektów w Warszawie, Grodzisku Mazowieckim, Łodzi i całym województwie mazowieckim i łódzkim.",
  alternates: {
    canonical: "https://fp-solutions.pl/ibp",
  },
  openGraph: {
    title: "Instrukcja Bezpieczeństwa Pożarowego – Warszawa i okolice",
    description:
      "Profesjonalne opracowanie IBP w Warszawie, Łodzi i całym woj. mazowieckim i łódzkim.",
    url: "https://fp-solutions.pl/ibp",
  },
};

const IBP = () => {
  return (
    <>
      <Breadcrumb
        pageName="Instrukcja Bezpieczeństwa Pożarowego"
        description="Profesjonalne opracowanie IBP – Warszawa, Łódź, woj. mazowieckie i łódzkie"
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
                  alt="Instrukcja Bezpieczeństwa Pożarowego Warszawa"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:hidden dark:drop-shadow-none"
                />
                <Image
                  src="/images/ibp.jpg"
                  alt="Instrukcja Bezpieczeństwa Pożarowego Warszawa"
                  fill
                  className="hidden rounded-md object-cover drop-shadow-three dark:block dark:drop-shadow-none"
                />
              </div>
            </div>
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Instrukcja Bezpieczeństwa Pożarowego"
                paragraph="Instrukcja Bezpieczeństwa Pożarowego (IBP) to kluczowy dokument określający warunki ochrony przeciwpożarowej. Oferuję kompleksowe opracowanie Instrukcji Bezpieczeństwa Pożarowego, dostosowanej do specyfiki Państwa obiektu, zgodnie z aktualnymi przepisami prawa."
                mb="44px"
              />
              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kiedy Instrukcja Bezpieczeństwa Pożarowego jest wymagana?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Zgodnie z prawem, właściciele, zarządcy lub użytkownicy
                    obiektów bądź ich części stanowiących odrębne strefy
                    pożarowe, przeznaczonych do wykonywania funkcji użyteczności
                    publicznej, zamieszkania zbiorowego, produkcyjnych,
                    magazynowych oraz inwentarskich, zapewniają i wdrażają
                    instrukcję bezpieczeństwa pożarowego, gdy spełnione są
                    warunki:
                  </p>
                  <ul className="mt-4 pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      kubatura brutto budynku lub jego części stanowiącej
                      odrębną strefę pożarową wynosi 1000 m<sup>3</sup> lub
                      więcej,
                    </li>
                    <li className="list-disc">
                      kubatura brutto budynku inwentarskiego wynosi 1500 m
                      <sup>3</sup> lub więcej,
                    </li>
                    <li className="list-disc">
                      powierzchnia strefy pożarowej obiektu innego niż budynek
                      wynosi 1000 m<sup>2</sup> lub więcej,
                    </li>
                    <li className="list-disc">
                      w budynku występuje strefa zagrożenia wybuchem.
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kiedy Instrukcja Bezpieczeństwa Pożarowego <u>nie</u> jest
                    wymagana?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Instrukcja bezpieczeństwa pożarowego nie jest wymagana, gdy:
                  </p>
                  <ul className="mt-4 pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      kubatura brutto budynku lub jego części stanowiącej
                      odrębną strefę pożarową nie przekracza 1000 m<sup>3</sup>,
                    </li>
                    <li className="list-disc">
                      kubatura brutto budynku inwentarskiego nie przekracza 1500
                      m<sup>3</sup>,
                    </li>
                    <li className="list-disc">
                      powierzchnia strefy pożarowej obiektu innego niż budynek
                      nie przekracza 1000 m<sup>2</sup>.
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Podstawa prawna
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    §6 Rozporządzenia Ministra Spraw Wewnętrznych i
                    Administracji z dnia 7 czerwca 2010 r. w sprawie ochrony
                    przeciwpożarowej budynków, innych obiektów budowlanych i
                    terenów. (Dz. U. z 2023 r., poz. 822 z późn. zm.).
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dlaczego warto zlecić opracowanie Instrukcji Bezpieczeństwa
                    Pożarowego mojej osobie?
                  </h3>
                  <ul className="pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      Indywidualne podejście – każda instrukcja jest dopasowana
                      do specyfiki obiektu.
                    </li>
                    <li className="list-disc">
                      Doświadczenie i wiedza – wieloletnia praktyka w zakresie
                      ochrony ppoż.
                    </li>
                    <li className="list-disc">
                      Zgodność z przepisami – pełna zgodność z obowiązującym
                      prawem.
                    </li>
                    <li className="list-disc">
                      Kompleksowe wsparcie – doradztwo i pomoc również po
                      przygotowaniu dokumentu.
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Gdzie działam?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Swoje usługi z zakresu opracowywania Instrukcji
                    Bezpieczeństwa Pożarowego świadczę na terenie{" "}
                    <strong>Warszawy</strong>,{" "}
                    <strong>Grodziska Mazowieckiego</strong>,{" "}
                    <strong>Łodzi</strong> oraz całych województw{" "}
                    <strong>mazowieckiego</strong> i <strong>łódzkiego</strong>.
                    Działam również na terenie{" "}
                    <em>
                      Pruszkowa, Milanówka, Brwinowa, Żyrardowa, Sochaczewa,
                      Skierniewic
                    </em>{" "}
                    i innych miast.
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

export default IBP;
