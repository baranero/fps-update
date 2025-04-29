import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Operat przeciwpożarowy – Warszawa, Łódź, Grodzisk Mazowiecki",
  description:
    "Sporządzanie operatów ppoż. dla pozwolenia na odpady. Warszawa, Łódź, Grodzisk Mazowiecki. Województwo mazowieckie i łódzkie. Sprawdź, kiedy wymagany jest operat ppoż.",
  alternates: {
    canonical: "https://fp-solutions.pl/operat",
  },
  openGraph: {
    title: "Operat przeciwpożarowy – Warszawa i okolice",
    description:
      "Profesjonalne operaty ppoż. dla zezwoleń na zbieranie, przetwarzanie i wytwarzanie odpadów. Warszawa, Łódź, Grodzisk Mazowiecki, woj. mazowieckie i łódzkie.",
    url: "https://fp-solutions.pl/operat",
  },
};

const operat = () => {
  return (
    <>
      <Breadcrumb
        pageName="Operat ppoż."
        description="Sporządzanie operatów przeciwpożarowych niezbędnych do uzyskania pozwolenia na gospodarowanie odpadami. Warszawa, Łódź i okolice."
      />

      <section className="py-16 md:py-20 lg:py-28">
        <div className="container">
          <div className="-mx-4 flex flex-wrap items-start">
            <div className="w-full px-4 lg:w-1/2">
              <div
                className="wow fadeInUp relative mx-auto mb-12 aspect-[25/24] max-w-[500px] text-center lg:m-0"
                data-wow-delay=".15s"
              >
                <Image
                  src="/images/operat.jpg"
                  alt="Operat przeciwpożarowy Warszawa"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:hidden dark:drop-shadow-none"
                />
                <Image
                  src="/images/operat.jpg"
                  alt="Operat przeciwpożarowy Warszawa"
                  fill
                  className="hidden rounded-md object-cover drop-shadow-three dark:block dark:drop-shadow-none"
                />
              </div>
            </div>
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Operat przeciwpożarowy"
                paragraph="Operat ppoż. jest dokumentem koniecznym do wydania pozwolenia na zbieranie, przetwarzanie i/lub wytwarzanie odpadów. Stanowi załącznik do wniosku o wydanie pozwolenia. Określa i opiniuje zgodność warunków magazynowania odpadów z przepisami ochrony przeciwpożarowej."
                mb="44px"
              />
              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Operat przeciwpożarowy – kiedy wymagany?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Inwestor, który ubiega się o wydanie pozwolenia na
                    zbieranie, przetwarzanie, bądź wytwarzanie odpadów,
                    zobligowany jest do posiadania operatu ppoż., który dołącza
                    jako załącznik do wniosku. Obowiązek ten dotyczy zarówno
                    działalności przemysłowej, jak i magazynowej.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kto może sporządzić operat ppoż.?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    W zależności od organu właściwego, operat może sporządzić:
                  </p>

                  <p className="mt-2 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Gdy organem jest marszałek województwa lub regionalny
                    dyrektor ochrony środowiska:
                  </p>
                  <ul className="mt-1 pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      rzeczoznawca do spraw zabezpieczeń przeciwpożarowych
                    </li>
                  </ul>

                  <p className="mt-4 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Gdy organem jest starosta:
                  </p>
                  <ul className="mt-1 pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li className="list-disc">
                      inżynier pożarnictwa, magister inżynier pożarnictwa,
                    </li>
                    <li className="list-disc">
                      absolwent SGSP lub Akademii Pożarniczej na kierunku
                      inżynieria bezpieczeństwa pożarowego.
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Podstawa prawna
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Ustawa z dnia 14 grudnia 2012 r. o odpadach (Dz.U. 2023 poz.
                    1587 z późn. zm.)
                  </p>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Ustawa z dnia 27 kwietnia 2001 r. – Prawo ochrony środowiska
                    (Dz.U. 2024 poz. 54 z późn. zm.)
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Gdzie realizuję operaty przeciwpożarowe?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Sporządzam operaty ppoż. dla inwestorów w{" "}
                    <strong>Warszawie</strong>, <strong>Łodzi</strong>,{" "}
                    <strong>Grodzisku Mazowieckim</strong> oraz całym{" "}
                    <strong>województwie mazowieckim i łódzkim</strong>.
                    Działam również na terenie{" "}
                    <em>
                      Pruszkowa, Milanówka, Brwinowa, Żyrardowa, Sochaczewa, Skierniewic
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

export default operat;
