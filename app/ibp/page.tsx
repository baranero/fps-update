import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Instrukcja Bezpieczeństwa Pożarowego | Inżynieria Pożarowa – Warszawa, Łódź",
  description:
    "Opracowanie Instrukcji Bezpieczeństwa Pożarowego (IBP) przez eksperta inżynierii bezpieczeństwa pożarowego. Obsługujemy obiekty w Warszawie, Łodzi, Grodzisku Maz. i okolicach.",
  alternates: {
    canonical: "https://fp-solutions.pl/ibp",
  },
  openGraph: {
    title: "Instrukcja Bezpieczeństwa Pożarowego – Warszawa, Łódź i okolice",
    description:
      "Profesjonalne opracowanie IBP w Warszawie, Łodzi i całym woj. mazowieckim oraz łódzkim. Zadbaj o zgodność z prawem i bezpieczeństwo swojego obiektu.",
    url: "https://fp-solutions.pl/ibp",
  },
};

const IbpPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Instrukcja Bezpieczeństwa Pożarowego"
        description="Profesjonalne opracowanie IBP zgodne z aktualnymi przepisami – eksperckie usługi dla Warszawy, Łodzi oraz województw mazowieckiego i łódzkiego."
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
                  src="/images/ibp.jpg"
                  alt="Opracowanie Instrukcji Bezpieczeństwa Pożarowego IBP Warszawa"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:drop-shadow-none"
                />
              </div>
            </div>

            {/* Sekcja Treści */}
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Instrukcja Bezpieczeństwa Pożarowego (IBP)"
                paragraph="Instrukcja Bezpieczeństwa Pożarowego to kluczowy dokument określający warunki ochrony przeciwpożarowej w budynku. Jako specjalista w zakresie inżynierii bezpieczeństwa pożarowego, oferuję kompleksowe opracowanie IBP, precyzyjnie dostosowanej do specyfiki i architektury Państwa obiektu, w pełnej zgodności z obowiązującym prawem."
                mb="44px"
              />
              
              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kiedy Instrukcja Bezpieczeństwa Pożarowego jest wymagana?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Zgodnie z przepisami prawa, właściciele, zarządcy lub użytkownicy obiektów (bądź ich części stanowiących odrębne strefy pożarowe), przeznaczonych do wykonywania funkcji użyteczności publicznej, zamieszkania zbiorowego, produkcyjnych, magazynowych oraz inwentarskich, mają obowiązek wdrożenia IBP, gdy spełniony jest co najmniej jeden z warunków:
                  </p>
                  <ul className="mt-4 list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>kubatura brutto budynku lub jego części stanowiącej odrębną strefę pożarową wynosi 1000 m<sup>3</sup> lub więcej,</li>
                    <li>kubatura brutto budynku inwentarskiego wynosi 1500 m<sup>3</sup> lub więcej,</li>
                    <li>powierzchnia strefy pożarowej obiektu innego niż budynek wynosi 1000 m<sup>2</sup> lub więcej,</li>
                    <li>w budynku występuje strefa zagrożenia wybuchem.</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kiedy Instrukcja <u>nie</u> jest wymagana?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Dokument ten nie jest bezwzględnie wymagany w przypadku mniejszych obiektów, w których:
                  </p>
                  <ul className="mt-4 list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>kubatura brutto budynku nie przekracza 1000 m<sup>3</sup>,</li>
                    <li>kubatura brutto budynku inwentarskiego nie przekracza 1500 m<sup>3</sup>,</li>
                    <li>powierzchnia strefy pożarowej obiektu (niebędącego budynkiem) nie przekracza 1000 m<sup>2</sup>.</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Podstawa prawna opracowania IBP
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Wymogi sporządzenia dokumentu precyzuje §6 Rozporządzenia Ministra Spraw Wewnętrznych i Administracji z dnia 7 czerwca 2010 r. w sprawie ochrony przeciwpożarowej budynków, innych obiektów budowlanych i terenów (Dz. U. z 2023 r., poz. 822 z późn. zm.).
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Dlaczego warto zlecić mi opracowanie IBP?
                  </h3>
                  <ul className="list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li><strong>Wiedza i uprawnienia</strong> – posiadam wykształcenie i doświadczenie z zakresu inżynierii bezpieczeństwa pożarowego.</li>
                    <li><strong>Indywidualne podejście</strong> – każdą instrukcję opracowuję na podstawie rzetelnego audytu lokalnego, bez powielania gotowych szablonów.</li>
                    <li><strong>Zgodność z przepisami</strong> – gwarantuję, że dokument zostanie zaakceptowany przez organy kontrolne (np. Państwową Straż Pożarną).</li>
                    <li><strong>Kompleksowe wsparcie</strong> – pomagam we wdrożeniu zapisów instrukcji w obiekcie.</li>
                  </ul>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Gdzie realizuję zlecenia?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Swoje usługi z zakresu opracowywania Instrukcji Bezpieczeństwa Pożarowego świadczę lokalnie na terenie <strong>Warszawy</strong>, <strong>Grodziska Mazowieckiego</strong>, <strong>Łodzi</strong> oraz całych województw <strong>mazowieckiego</strong> i <strong>łódzkiego</strong> (m.in. Pruszków, Milanówek, Brwinów, Żyrardów, Sochaczew, Skierniewice).
                  </p>
                </div>

                {/* Sekcja Call To Action (CTA) */}
                <div className="mt-8 rounded-sm border-l-4 border-primary bg-primary/5 p-6">
                  <p className="text-base font-bold leading-relaxed text-black dark:text-white sm:text-lg sm:leading-relaxed">
                    Twój obiekt wymaga Instrukcji Bezpieczeństwa Pożarowego? Skontaktuj się ze mną, aby ustalić szczegóły i otrzymać szybką wycenę opracowania dokumentacji.
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

export default IbpPage;