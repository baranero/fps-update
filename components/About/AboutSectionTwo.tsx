import Image from "next/image";
import SectionTitle from "../Common/SectionTitle";

const AboutSectionTwo = () => {
  return (
    <section className="py-16 md:py-20 lg:py-28">
      <div className="container">
        <div className="-mx-4 flex flex-wrap items-center">
          <div className="w-full px-4 lg:w-1/2">
            <div
              className="wow fadeInUp relative mx-auto mb-12 aspect-[25/24] max-w-[500px] text-center lg:m-0"
              data-wow-delay=".15s"
            >
              <Image
                src="/images/about/pw.png"
                alt="about image"
                fill
                className="drop-shadow-three dark:hidden object-contain dark:drop-shadow-none"
              />
              <Image
                src="/images/about/pw.png"
                alt="about image"
                fill
                className="drop-shadow-three hidden object-contain dark:block dark:drop-shadow-none"
              />
            </div>
          </div>
          <div className="w-full px-4 lg:w-1/2">
          <SectionTitle
                title="Branżowe wykształcenie"
                paragraph="                  Jestem absolwentem Szkoły Głównej Służby Pożarnicznej (obecnie Akademia Pożarnicza), gdzie zdobyłem wykształcenie I i II stopnia z dziedziny inżynierii bezpieczeństwa i bezpieczeństwa pożarowego. Dodatkowo rozszerzam swoją wiedzę z zakresu wentylacji pożarowej i systemów oddymiaia budynków na Politechnice Warszawskiej."
                mb="44px"
              />
            <div className="wow fadeInUp max-w-[470px]" data-wow-delay=".2s">
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                  Szkoła Główna Służby Pożarniczej
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Absolwent studiów I stopnia na kierunku Inżynieria Bezpieczeństwa Pożarowego <br />
                Absolwent studiów II stopnia na kierunku Inżynieria Bezpieczeństwa
                </p>
              </div>
              <div className="mb-9">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                  Politechnika Warszawska
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                Studia podyplomowe z zakresu wentylacji pożarowej i systemów oddymiania budynków
                </p>
              </div>
              {/* <div className="mb-1">
                <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                  Next.js
                </h3>
                <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                  Lorem ipsum dolor sit amet, sed do eiusmod tempor incididunt
                  consectetur adipiscing elit setim.
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSectionTwo;
