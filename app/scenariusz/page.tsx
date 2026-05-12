import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Scenariusz rozwoju pożaru | Inżynier pożarnictwa – Warszawa, Łódź",
  description:
    "Opracowanie scenariuszy rozwoju pożaru dla projektów SSP, DSO, oddymiania i urządzeń ppoż. Eksperckie usługi: Warszawa, Łódź, Grodzisk Mazowiecki, całe woj. mazowieckie i łódzkie.",
  alternates: {
    canonical: "https://fp-solutions.pl/scenariusz",
  },
  openGraph: {
    title: "Scenariusz pożarowy – Warszawa, Łódź i okolice",
    description:
      "Profesjonalne opracowanie scenariusza rozwoju zdarzeń w czasie pożaru dla projektów SSP, DSO, oddymiania. Zgodność z wytycznymi rzeczoznawców. Działamy w Warszawie, Łodzi, Grodzisku Mazowieckim.",
    url: "https://fp-solutions.pl/scenariusz",
  },
};

const ScenariuszPozarowyPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Scenariusz rozwoju pożaru"
        description="Profesjonalne opracowanie scenariuszy pożarowych dla projektów SSP, DSO, systemów oddymiania i innych urządzeń ppoż. Warszawa, Łódź i województwa mazowieckie oraz łódzkie."
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
                  src="/images/audyt-1.jpg" // Jeśli masz dedykowane zdjęcie do scenariuszy, podmień ten link
                  alt="Opracowanie scenariusza rozwoju pożaru dla budynku - dokumentacja projektowa"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:drop-shadow-none"
                />
              </div>
            </div>

            {/* Sekcja Treści */}
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Scenariusz rozwoju zdarzeń w czasie pożaru"
                paragraph="Zgodnie z § 5 pkt 3 Rozporządzenia MSWiA z dnia 5 sierpnia 2023 r. (Dz.U. 2023 poz. 1563), projekt techniczny dla obiektów budowlanych, w których przewiduje się zastosowanie urządzeń przeciwpożarowych, powinien obligatoryjnie zawierać scenariusz rozwoju zdarzeń w czasie pożaru."
                mb="44px"
              />

              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                <div className="mb-9">
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Scenariusz pożarowy to kluczowy inżynieryjny dokument projektowy, którego
                    celem jest wykazanie, że zastosowane w obiekcie rozwiązania techniczne
                    zapewniają skuteczne wykrycie pożaru, alarmowanie, sprawną ewakuację
                    oraz prawidłowe uruchomienie i współpracę wszystkich urządzeń przeciwpożarowych w
                    warunkach rzeczywistego zagrożenia.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Co powinien zawierać scenariusz pożarowy?
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Szczegółową charakterystykę pożaru i jego rozwój w czasie</li>
                    <li>Opis zasady działania i integracji systemów SSP, DSO, tryskaczy, oddymiania, klap ppoż.</li>
                    <li>Chronologię aktywacji urządzeń automatycznych i ręcznych w sterowaniach matrycowych</li>
                    <li>Czas zadziałania oraz dokładne wartości progowe (np. temperatura, gęstość dymu)</li>
                    <li>Analizę warunków i wyliczenie czasu dostępnego na bezpieczną ewakuację ludzi</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dla kogo jest wymagany?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Scenariusz pożarowy należy opracować dla obiektów, w których projektuje się:
                  </p>
                  <ul className="mt-3 list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>System sygnalizacji pożaru (SSP)</li>
                    <li>Systemy oddymiania lub przewietrzania pożarowego</li>
                    <li>DSO – dźwiękowy system ostrzegawczy</li>
                    <li>Systemy tryskaczowe, zraszaczowe i inne urządzenia gaśnicze</li>
                  </ul>
                  <p className="mt-4 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Opracowanie poprawnego scenariusza jest <strong>obowiązkowe</strong> przy uzgadnianiu projektu z rzeczoznawcą ds. zabezpieczeń ppoż.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dlaczego warto zlecić to zadanie specjaliście?
                  </h3>
                  <p className="mb-3 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Powierzenie tego zadania doświadczonemu inżynierowi bezpieczeństwa pożarowego to:
                  </p>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Gwarancja pełnej zgodności z aktualnymi przepisami i normami</li>
                    <li>Znaczne ułatwienie i przyspieszenie uzyskania pozytywnej opinii rzeczoznawcy ppoż.</li>
                    <li>Pewność, że systemy ppoż. będą prawidłowo zintegrowane i zadziałają w odpowiedniej sekwencji</li>
                    <li>Zminimalizowanie ryzyka kosztownych błędów projektowych i wykonawczych</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Gdzie realizuję opracowanie scenariuszy pożarowych?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wykonuję scenariusze rozwoju pożaru dla inwestycji w{" "}
                    <strong>Warszawie</strong>, <strong>Łodzi</strong>,{" "}
                    <strong>Grodzisku Mazowieckim</strong> oraz na terenie
                    całego <strong>województwa mazowieckiego i łódzkiego</strong>.
                    Z powodzeniem działam również na terenie miast takich jak:{" "}
                    <em>Pruszków, Milanówek, Brwinów, Żyrardów, Sochaczew, Skierniewice</em>.
                  </p>
                </div>

                {/* Sekcja Call To Action (CTA) */}
                <div className="mt-8 rounded-sm border-l-4 border-primary bg-primary/5 p-6">
                  <p className="text-base font-bold leading-relaxed text-black dark:text-white sm:text-lg sm:leading-relaxed">
                    Potrzebujesz profesjonalnie opracowanego scenariusza pożarowego dla swojej inwestycji? Zapewniam pełne wsparcie projektowe oraz płynną współpracę z rzeczoznawcą. Skontaktuj się ze mną już dziś!
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

export default ScenariuszPozarowyPage;