import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Audyt przeciwpożarowy | Inżynieria Bezpieczeństwa Pożarowego – Warszawa, Łódź",
  description:
    "Profesjonalne audyty przeciwpożarowe budynków i obiektów. Usługi z zakresu inżynierii bezpieczeństwa pożarowego: Warszawa, Łódź, Grodzisk Mazowiecki, woj. mazowieckie i łódzkie.",
  alternates: {
    canonical: "https://fp-solutions.pl/audyt",
  },
  openGraph: {
    title: "Audyt przeciwpożarowy – Warszawa, Łódź i okolice",
    description:
      "Wykonujemy eksperckie audyty ppoż. w Warszawie, Łodzi i całym woj. mazowieckim oraz łódzkim. Ocena warunków ochrony przeciwpożarowej, dróg ewakuacyjnych i wyposażenia.",
    url: "https://fp-solutions.pl/audyt",
  },
};

const AudytPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Audyt ppoż."
        description="Profesjonalny audyt ochrony przeciwpożarowej – wsparcie z zakresu inżynierii bezpieczeństwa pożarowego dla Warszawy, Łodzi, Grodziska Mazowieckiego i okolic."
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
                  src="/images/audyt-1.jpg"
                  alt="Ekspercki audyt przeciwpożarowy budynku Warszawa"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:drop-shadow-none"
                />
              </div>
            </div>

            {/* Sekcja Treści */}
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Audyt przeciwpożarowy obiektów"
                paragraph="Audyt przeciwpożarowy to szczegółowa analiza stanu bezpieczeństwa pożarowego budynku oraz jego zgodności z obowiązującymi przepisami. Jako eksperci w dziedzinie inżynierii bezpieczeństwa pożarowego, identyfikujemy potencjalne zagrożenia i nieprawidłowości, które mogą wpłynąć na bezpieczeństwo użytkowników obiektu."
                mb="44px"
              />

              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Zakres audytu przeciwpożarowego
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Ocena warunków ochrony przeciwpożarowej budynku</li>
                    <li>Weryfikacja wyposażenia w sprzęt gaśniczy i systemy pożarowe</li>
                    <li>Sprawdzenie warunków ewakuacji i prawidłowości oznakowania dróg ewakuacyjnych</li>
                    <li>Analiza procedur postępowania na wypadek pożaru</li>
                    <li>Kontrola dokumentacji związanej z ochroną przeciwpożarową (np. IBP)</li>
                    <li>Ocena ważności i aktualności szkoleń z zakresu ochrony ppoż.</li>
                  </ul>
                  <p className="mt-4 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Po zakończeniu audytu przekazujemy szczegółowy raport inżynierski wraz z konkretnymi zaleceniami dotyczącymi niezbędnych działań korygujących.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dlaczego warto przeprowadzić audyt?
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Zwiększasz realne bezpieczeństwo użytkowników obiektu</li>
                    <li>Unikasz sankcji prawnych i kar finansowych ze strony organów nadzoru</li>
                    <li>Umożliwiasz płynne dostosowanie obiektu do aktualnych przepisów budowlanych i ppoż.</li>
                    <li>Uzyskujesz jasne zalecenia od inżyniera bezpieczeństwa pożarowego</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dla kogo przeznaczona jest usługa?
                  </h3>
                  <p className="mb-3 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Nasz audyt ppoż. skierowany jest w szczególności do:
                  </p>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Właścicieli i zarządców budynków mieszkalnych oraz biurowych</li>
                    <li>Przedsiębiorców prowadzących działalność w obiektach komercyjnych, halach i magazynach</li>
                    <li>Instytucji publicznych, edukacyjnych i administracyjnych</li>
                    <li>Inwestorów przygotowujących nowe inwestycje lub adaptacje istniejących budynków</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Podstawa prawna audytu
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>
                      Ustawa z dnia 24 sierpnia 1991 r. o ochronie przeciwpożarowej (Dz.U. 2025 poz. 188)
                    </li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Gdzie realizujemy audyty przeciwpożarowe?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wykonujemy audyty przeciwpożarowe na terenie <strong>Warszawy</strong>, <strong>Łodzi</strong>, <strong>Grodziska Mazowieckiego</strong> oraz całego <strong>województwa mazowieckiego i łódzkiego</strong>. Działamy również na terenie miast takich jak: <em>Pruszków, Milanówek, Brwinów, Żyrardów, Sochaczew czy Skierniewice</em>.
                  </p>
                </div>

                <div className="mt-8 rounded-sm bg-primary/5 p-6 border-l-4 border-primary">
                  <p className="text-base font-bold leading-relaxed text-black dark:text-white sm:text-lg sm:leading-relaxed">
                    Skontaktuj się z nami, aby umówić audyt lub uzyskać indywidualną ofertę. Zadbaj o bezpieczeństwo swojego obiektu już dziś!
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

export default AudytPage;