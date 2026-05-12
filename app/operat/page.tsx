import Breadcrumb from "@/components/Common/Breadcrumb";
import SectionTitle from "@/components/Common/SectionTitle";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Operat przeciwpożarowy odpadów | Inżynier pożarnictwa – Warszawa, Łódź",
  description:
    "Sporządzanie operatów ppoż. wymaganych do pozwolenia na odpady przez inżyniera pożarnictwa. Warszawa, Łódź, Grodzisk Mazowiecki, woj. mazowieckie i łódzkie.",
  alternates: {
    canonical: "https://fp-solutions.pl/operat",
  },
  openGraph: {
    title: "Operat przeciwpożarowy – Warszawa, Łódź i okolice",
    description:
      "Profesjonalne operaty ppoż. dla zezwoleń na zbieranie, przetwarzanie i wytwarzanie odpadów. Gwarancja rzetelności inżynierskiej. Warszawa, Łódź, Grodzisk Mazowiecki.",
    url: "https://fp-solutions.pl/operat",
  },
};

const OperatPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Operat przeciwpożarowy"
        description="Profesjonalne sporządzanie operatów przeciwpożarowych niezbędnych do uzyskania pozwolenia na gospodarowanie odpadami – usługi dla Warszawy, Łodzi i okolic."
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
                  src="/images/operat.jpg"
                  alt="Sporządzanie operatu przeciwpożarowego dla miejsc magazynowania odpadów"
                  fill
                  className="rounded-md object-cover drop-shadow-three dark:drop-shadow-none"
                />
              </div>
            </div>

            {/* Sekcja Treści */}
            <div className="w-full px-4 lg:w-1/2">
              <SectionTitle
                title="Operat przeciwpożarowy"
                paragraph="Operat ppoż. jest obligatoryjnym dokumentem wymaganym do wydania pozwolenia na zbieranie, przetwarzanie i/lub wytwarzanie odpadów. Stanowi on kluczowy załącznik do wniosku, określający i opiniujący zgodność warunków magazynowania odpadów z rygorystycznymi przepisami ochrony przeciwpożarowej i inżynierii bezpieczeństwa."
                mb="44px"
              />
              
              <div className="wow fadeInUp max-w-[650px]" data-wow-delay=".2s">
                
                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kiedy wymagany jest operat przeciwpożarowy?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Każdy inwestor i przedsiębiorca, który ubiega się o wydanie pozwolenia na
                    zbieranie, przetwarzanie bądź wytwarzanie odpadów,
                    zobligowany jest prawem do posiadania aktualnego operatu ppoż. Dokument ten dołącza się
                    jako załącznik do wniosku właściwego organu. Obowiązek ten dotyczy zarówno
                    działalności przemysłowej, hal produkcyjnych, jak i otwartych terenów magazynowych.
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Kto może prawnie sporządzić operat ppoż.?
                  </h3>
                  <p className="mb-3 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    W zależności od organu wydającego zezwolenie, operat może sporządzić wyłącznie osoba z określonymi kwalifikacjami z zakresu ochrony ppoż.:
                  </p>

                  <p className="mt-2 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Gdy organem jest marszałek województwa lub regionalny dyrektor ochrony środowiska:
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li>Rzeczoznawca do spraw zabezpieczeń przeciwpożarowych</li>
                  </ul>

                  <p className="mt-4 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Gdy organem decyzyjnym jest starosta:
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    <li><strong>Inżynier pożarnictwa</strong> lub magister inżynier pożarnictwa,</li>
                    <li>Absolwent SGSP (obecnie Akademii Pożarniczej) na kierunku <strong>inżynieria bezpieczeństwa pożarowego</strong>.</li>
                  </ul>
                  <p className="mt-4 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Jako inżynier bezpieczeństwa pożarowego posiadam pełne uprawnienia do opracowywania operatów dla organów powiatowych (starostw).
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Podstawa prawna
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Ustawa z dnia 14 grudnia 2012 r. o odpadach (Dz.U. 2023 poz. 1587 z późn. zm.)
                  </p>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Ustawa z dnia 27 kwietnia 2001 r. – Prawo ochrony środowiska (Dz.U. 2024 poz. 54 z późn. zm.)
                  </p>
                </div>

                <div className="mb-9">
                  <h3 className="mb-4 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    Gdzie realizuję operaty przeciwpożarowe?
                  </h3>
                  <p className="text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed">
                    Sporządzam operaty ppoż. dla przedsiębiorców i inwestorów w{" "}
                    <strong>Warszawie</strong>, <strong>Łodzi</strong>,{" "}
                    <strong>Grodzisku Mazowieckim</strong> oraz całym{" "}
                    <strong>województwie mazowieckim i łódzkim</strong>.
                    Działam i wspieram firmy również na terenie miast:{" "}
                    <em>Pruszków, Milanówek, Brwinów, Żyrardów, Sochaczew, Skierniewice</em>.
                  </p>
                </div>

                {/* Sekcja Call To Action (CTA) */}
                <div className="mt-8 rounded-sm border-l-4 border-primary bg-primary/5 p-6">
                  <p className="text-base font-bold leading-relaxed text-black dark:text-white sm:text-lg sm:leading-relaxed">
                    Otwierasz punkt zbierania lub przetwarzania odpadów? Zleć mi sporządzenie operatu przeciwpożarowego. Skontaktuj się ze mną po darmową konsultację i wycenę usługi.
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

export default OperatPage;