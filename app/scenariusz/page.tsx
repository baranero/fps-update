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
      <Breadcrumb pageName="Scenariusz rozwoju pożaru" description="" />

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
                  alt="rop"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:hidden dark:drop-shadow-none"
                />
                <Image
                  src="/images/audyt-1.jpg"
                  alt="rop"
                  fill
                  className="hidden rounded-md object-cover drop-shadow-three dark:block dark:drop-shadow-none"
                />
              </div>
            </div>
            <div className="w-full px-4 lg:w-1/2">
            <SectionTitle
  title="Scenariusz rozwoju zdarzeń w czasie pożaru"
  paragraph="Zgodnie z § 5 pkt 3 Rozporządzenia Ministra Spraw Wewnętrznych i Administracji z dnia 5 sierpnia 2023 r. (Dz.U. 2023 poz. 1563), projekt techniczny dla obiektów budowlanych, w których przewiduje się zastosowanie urządzeń przeciwpożarowych, powinien zawierać scenariusz rozwoju zdarzeń w czasie pożaru."
  mb="44px"
/>

<div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
  <div className="mb-9">
    <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
      Scenariusz pożarowy to kluczowy dokument projektowy, którego celem jest wykazanie, że zastosowane rozwiązania techniczne zapewniają skuteczne wykrycie pożaru, alarmowanie, ewakuację oraz uruchomienie i współpracę urządzeń przeciwpożarowych w warunkach rzeczywistego zagrożenia.
    </p>
  </div>

  <div className="mb-9">
    <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
      Co powinien zawierać scenariusz pożarowy?
    </h3>
    <ul className="pl-5 list-disc text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
      <li>Charakterystykę pożaru i jego rozwój w czasie</li>
      <li>Opis działania systemów SSP, DSO, tryskaczy, oddymiania, klap ppoż.</li>
      <li>Chronologię aktywacji urządzeń automatycznych i ręcznych</li>
      <li>Czas zadziałania oraz wartości progowe (np. temperatura, dym)</li>
      <li>Warunki i czas dostępny na ewakuację ludzi</li>
    </ul>
  </div>

  <div className="mb-9">
    <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
      Dla kogo jest wymagany?
    </h3>
    <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
      Scenariusz pożarowy należy opracować dla obiektów, w których projektuje się:
    </p>
    <ul className="pl-5 list-disc text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
      <li>System sygnalizacji pożaru (SSP)</li>
      <li>Systemy oddymiania lub przewietrzania</li>
      <li>DSO – dźwiękowy system ostrzegawczy</li>
      <li>Systemy tryskaczowe i inne urządzenia ppoż.</li>
    </ul>
    <p className="mt-4 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
      Opracowanie scenariusza jest również obowiązkowe przy uzgadnianiu projektu z rzeczoznawcą ds. zabezpieczeń ppoż.
    </p>
  </div>

  <div className="mb-9">
    <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
      Dlaczego warto zlecić opracowanie specjalistom?
    </h3>
    <ul className="pl-5 list-disc text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
      <li>Gwarancja zgodności z aktualnymi przepisami</li>
      <li>Ułatwia uzyskanie pozytywnej opinii rzeczoznawcy</li>
      <li>Wspiera prawidłowe działanie i integrację systemów ppoż.</li>
      <li>Minimalizuje ryzyko błędów projektowych i wykonawczych</li>
    </ul>
  </div>

  <div>
    <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
      Skontaktuj się z nami, jeśli potrzebujesz profesjonalnie opracowanego scenariusza pożarowego – zapewniamy pełne wsparcie projektowe oraz współpracę z rzeczoznawcą do spraw zabezpieczeń przeciwpożarowych.
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
