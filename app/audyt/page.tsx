import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Audyt przeciwpożarowy – Warszawa, Łódź, Grodzisk Mazowiecki",
  description:
    "Profesjonalne audyty przeciwpożarowe budynków i obiektów. Warszawa, Łódź, Grodzisk Mazowiecki, woj. mazowieckie i łódzkie. Sprawdź zakres audytu ppoż.",
  alternates: {
    canonical: "https://fp-solutions.pl/audyt",
  },
  openGraph: {
    title: "Audyt przeciwpożarowy – Warszawa i okolice",
    description:
      "Wykonujemy audyty ppoż. w Warszawie, Łodzi i całym woj. mazowieckim i łódzkim. Ocena warunków ochrony przeciwpożarowej, dróg ewakuacyjnych i wyposażenia obiektów.",
    url: "https://fp-solutions.pl/audyt",
  },
};

const audyt = () => {
  return (
    <>
      <Breadcrumb
        pageName="Audyt ppoż."
        description="Profesjonalny audyt ochrony przeciwpożarowej – Warszawa, Łódź, Grodzisk Mazowiecki i województwa mazowieckie oraz łódzkie."
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
                  src="/images/audyt-1.jpg"
                  alt="Audyt przeciwpożarowy Warszawa"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:hidden dark:drop-shadow-none"
                />
                <Image
                  src="/images/audyt-1.jpg"
                  alt="Audyt przeciwpożarowy Warszawa"
                  fill
                  className="hidden rounded-md object-cover drop-shadow-three dark:block dark:drop-shadow-none"
                />
              </div>
            </div>
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Audyt przeciwpożarowy"
                paragraph="Audyt przeciwpożarowy to szczegółowa analiza stanu bezpieczeństwa pożarowego budynku oraz jego zgodności z obowiązującymi przepisami. Celem audytu jest identyfikacja potencjalnych zagrożeń i nieprawidłowości, które mogą wpłynąć na bezpieczeństwo użytkowników obiektu oraz zgodność z wymaganiami prawnymi."
                mb="44px"
              />

              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Zakres audytu przeciwpożarowego
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Ocena warunków ochrony przeciwpożarowej</li>
                    <li>
                      Weryfikacja wyposażenia w sprzęt gaśniczy i systemy
                      pożarowe
                    </li>
                    <li>
                      Sprawdzenie warunków ewakuacji i oznakowania dróg
                      ewakuacyjnych
                    </li>
                    <li>Analiza procedur postępowania na wypadek pożaru</li>
                    <li>
                      Kontrola dokumentacji związanej z ochroną przeciwpożarową
                    </li>
                    <li>Ocena aktualności szkoleń z zakresu ochrony ppoż.</li>
                  </ul>
                  <p className="mt-4 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Po zakończeniu audytu przekazujemy szczegółowy raport wraz z
                    zaleceniami dotyczącymi działań korygujących.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dlaczego warto przeprowadzić audyt?
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Zwiększasz bezpieczeństwo użytkowników obiektu</li>
                    <li>Unikasz sankcji prawnych i finansowych</li>
                    <li>
                      Umożliwiasz dostosowanie obiektu do aktualnych przepisów
                    </li>
                    <li>
                      Uzyskujesz jasne zalecenia dotyczące poprawy stanu ochrony
                      ppoż.
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dla kogo jest audyt?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Usługa audytu ppoż. skierowana jest do:
                  </p>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Właścicieli i zarządców budynków mieszkalnych</li>
                    <li>
                      Przedsiębiorców prowadzących działalność w obiektach
                      komercyjnych
                    </li>
                    <li>
                      Instytucji publicznych, edukacyjnych i administracyjnych
                    </li>
                    <li>
                      Inwestorów przygotowujących nowe inwestycje lub adaptacje
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Podstawa prawna
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>
                      Ustawa z dnia 24 sierpnia 1991 r. o ochronie
                      przeciwpożarowej (Dz.U. 2025 poz. 188)
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Gdzie realizuję audyty przeciwpożarowe?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wykonuję audyty przeciwpożarowe na terenie{" "}
                    <strong>Warszawy</strong>, <strong>Łodzi</strong>,{" "}
                    <strong>Grodziska Mazowieckiego</strong> oraz całego{" "}
                    <strong>województwa mazowieckiego i łódzkiego</strong>.
                    Działam również na terenie{" "}
                    <em>
                      Pruszkowa, Milanówka, Brwinowa, Żyrardowa, Sochaczewa, Skierniewic
                    </em>{" "}
                    i innych miast.
                  </p>
                </div>

                <div>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Skontaktuj się z nami, aby umówić audyt lub uzyskać
                    indywidualną ofertę – zadbaj o bezpieczeństwo swojego
                    obiektu już dziś.
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
