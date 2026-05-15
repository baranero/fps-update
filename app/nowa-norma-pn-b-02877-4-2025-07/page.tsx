import TagButton from "@/components/Blog/TagButton";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analiza nowej normy PN-B-02877-4:2025-07 | Fire Protection Solutions",
  description:
    "Zmiany w projektowaniu systemów oddymiania grawitacyjnego. Analiza nowej normy PN-B-02877-4:2025-07 na tle dotychczasowych przepisów z 2001 i 2006 roku.",
  alternates: {
    canonical: "https://fp-solutions.pl/blog/norma-02877",
  },
  openGraph: {
    title: "Analiza nowej normy PN-B-02877-4:2025-07",
    description:
      "Zmiany w projektowaniu systemów oddymiania grawitacyjnego. Analiza nowej normy na tle dotychczasowych przepisów.",
    url: "https://fp-solutions.pl/blog/norma-02877",
  },
};

const BlogDetailsPage = () => {
  return (
    <>
      <section className="pb-[120px] pt-[150px]">
        <div className="container">
          <div className="-mx-4 flex flex-wrap justify-center">
            <div className="w-full px-4 lg:w-8/12">
              <article>
                <h1 className="mb-8 text-3xl font-bold leading-tight text-black dark:text-white sm:text-4xl sm:leading-tight">
                  Zmiany w projektowaniu systemów oddymiania: Analiza nowej normy PN-B-02877-4:2025-07
                </h1>

                {/* Meta informacje o autorze i dacie */}
                <div className="mb-10 flex flex-wrap items-center justify-between border-b border-body-color border-opacity-10 pb-4 dark:border-white dark:border-opacity-10">
                  <div className="flex flex-wrap items-center">
                    <div className="mb-5 mr-10 flex items-center">
                      <div className="mr-4">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full">
                          <Image
                            src="/images/blog/jakub.jpg"
                            alt="Jakub Baran - inżynier bezpieczeństwa pożarowego"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div className="w-full">
                        <span className="mb-1 text-base font-medium text-body-color">
                          <span>Jakub Baran</span>
                        </span>
                      </div>
                    </div>
                    <div className="mb-5 flex items-center">
                      <p className="mr-5 flex items-center text-base font-medium text-body-color">
                        <span className="mr-3">
                          <svg width="15" height="15" viewBox="0 0 15 15" className="fill-current">
                            <path d="M3.89531 8.67529H3.10666C2.96327 8.67529 2.86768 8.77089 2.86768 8.91428V9.67904C2.86768 9.82243 2.96327 9.91802 3.10666 9.91802H3.89531C4.03871 9.91802 4.1343 9.82243 4.1343 9.67904V8.91428C4.1343 8.77089 4.03871 8.67529 3.89531 8.67529Z" />
                            <path d="M6.429 8.67529H5.64035C5.49696 8.67529 5.40137 8.77089 5.40137 8.91428V9.67904C5.40137 9.82243 5.49696 9.91802 5.64035 9.91802H6.429C6.57239 9.91802 6.66799 9.82243 6.66799 9.67904V8.91428C6.66799 8.77089 6.5485 8.67529 6.429 8.67529Z" />
                            <path d="M8.93828 8.67529H8.14963C8.00624 8.67529 7.91064 8.77089 7.91064 8.91428V9.67904C7.91064 9.82243 8.00624 9.91802 8.14963 9.91802H8.93828C9.08167 9.91802 9.17727 9.82243 9.17727 9.67904V8.91428C9.17727 8.77089 9.08167 8.67529 8.93828 8.67529Z" />
                            <path d="M11.4715 8.67529H10.6828C10.5394 8.67529 10.4438 8.77089 10.4438 8.91428V9.67904C10.4438 9.82243 10.5394 9.91802 10.6828 9.91802H11.4715C11.6149 9.91802 11.7105 9.82243 11.7105 9.67904V8.91428C11.7105 8.77089 11.591 8.67529 11.4715 8.67529Z" />
                            <path d="M3.89531 11.1606H3.10666C2.96327 11.1606 2.86768 11.2562 2.86768 11.3996V12.1644C2.86768 12.3078 2.96327 12.4034 3.10666 12.4034H3.89531C4.03871 12.4034 4.1343 12.3078 4.1343 12.1644V11.3996C4.1343 11.2562 4.03871 11.1606 3.89531 11.1606Z" />
                            <path d="M6.429 11.1606H5.64035C5.49696 11.1606 5.40137 11.2562 5.40137 11.3996V12.1644C5.40137 12.3078 5.49696 12.4034 5.64035 12.4034H6.429C6.57239 12.4034 6.66799 12.3078 6.66799 12.1644V11.3996C6.66799 11.2562 6.5485 11.1606 6.429 11.1606Z" />
                            <path d="M8.93828 11.1606H8.14963C8.00624 11.1606 7.91064 11.2562 7.91064 11.3996V12.1644C7.91064 12.3078 8.00624 12.4034 8.14963 12.4034H8.93828C9.08167 12.4034 9.17727 12.3078 9.17727 12.1644V11.3996C9.17727 11.2562 9.08167 11.1606 8.93828 11.1606Z" />
                            <path d="M11.4715 11.1606H10.6828C10.5394 11.1606 10.4438 11.2562 10.4438 11.3996V12.1644C10.4438 12.3078 10.5394 12.4034 10.6828 12.4034H11.4715C11.6149 12.4034 11.7105 12.3078 11.7105 12.1644V11.3996C11.7105 11.2562 11.591 11.1606 11.4715 11.1606Z" />
                            <path d="M13.2637 3.3697H7.64754V2.58105C8.19721 2.43765 8.62738 1.91189 8.62738 1.31442C8.62738 0.597464 8.02992 0 7.28906 0C6.54821 0 5.95074 0.597464 5.95074 1.31442C5.95074 1.91189 6.35702 2.41376 6.93058 2.58105V3.3697H1.31442C0.597464 3.3697 0 3.96716 0 4.68412V13.2637C0 13.9807 0.597464 14.5781 1.31442 14.5781H13.2637C13.9807 14.5781 14.5781 13.9807 14.5781 13.2637V4.68412C14.5781 3.96716 13.9807 3.3697 13.2637 3.3697ZM6.6677 1.31442C6.6677 0.979841 6.93058 0.716957 7.28906 0.716957C7.62364 0.716957 7.91042 0.979841 7.91042 1.31442C7.91042 1.649 7.64754 1.91189 7.28906 1.91189C6.95448 1.91189 6.6677 1.6251 6.6677 1.31442ZM1.31442 4.08665H13.2637C13.5983 4.08665 13.8612 4.34954 13.8612 4.68412V6.45261H0.716957V4.68412C0.716957 4.34954 0.979841 4.08665 1.31442 4.08665ZM13.2637 13.8612H1.31442C0.979841 13.8612 0.716957 13.5983 0.716957 13.2637V7.16957H13.8612V13.2637C13.8612 13.5983 13.5983 13.8612 13.2637 13.8612Z" />
                          </svg>
                        </span>
                        13.05.2026
                      </p>
                    </div>
                  </div>
                  <div className="mb-5">
                    <span className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                      Normy
                    </span>
                  </div>
                </div>

                {/* Właściwa treść artykułu */}
                <div>
                  <div className="mb-10 w-full overflow-hidden rounded">
                    <div className="relative aspect-[97/60] w-full sm:aspect-[97/44]">
                      <Image
                        src="/images/blog/blog2.jpg"
                        alt="Projektowanie systemów oddymiania zgodnie z nową normą"
                        fill
                        className="object-cover object-center"
                      />
                    </div>
                  </div>

                  <p className="mb-8 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    W lipcu 2025 roku Polski Komitet Normalizacyjny opublikował nową normę{" "}
                    <strong className="text-primary dark:text-white">PN-B-02877-4:2025-07</strong>{" "}
                    zatytułowaną „Systemy do grawitacyjnego odprowadzania dymu i ciepła – Część 4: Zasady
                    projektowania”. Dokument ten oficjalnie zastępuje wycofaną normę PN-B-02877-4 z 2001
                    roku wraz z jej niezwykle istotną zmianą (Az1) z września 2006 roku. Nowelizacja wprowadza
                    fundamentalne zmiany w metodyce projektowej, a zestawienie jej z historycznymi wymogami
                    ukazuje duży krok w stronę optymalizacji i dostosowania przepisów do współczesnego
                    budownictwa wielkopowierzchniowego.
                  </p>
                  
                  <p className="mb-10 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    Poniżej przedstawiono kluczowe różnice i nowe rozwiązania wprowadzone w dokumencie
                    z 2025 roku.
                  </p>

                  <h3 className="mb-6 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    1. Rewolucja w dopuszczalnych wielkościach stref dymowych
                  </h3>
                  <p className="mb-8 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    Najważniejszą zmianą z punktu widzenia architektonicznego jest powiększenie dopuszczalnej
                    wielkości stref dymowych. Zmiana Az1 wprowadzona w 2006 roku rygorystycznie ograniczyła
                    maksymalną powierzchnię przestrzeni poddachowej pojedynczej strefy dymowej do zaledwie
                    2 600 m². Nowa norma z 2025 roku znacząco liberalizuje to ograniczenie – podstawowa
                    maksymalna powierzchnia strefy dymowej w budynkach produkcyjnych i magazynowych
                    wynosi obecnie <strong className="text-black dark:text-white">4 000 m²</strong>. Dokument dopuszcza wręcz
                    powiększenie tej powierzchni o maksymalnie 50% (czyli nawet do 6 000 m²), jednak
                    wymaga to wówczas proporcjonalnego zwiększenia łącznej powierzchni czynnej urządzeń
                    oddymiających o 5% dla każdych rozpoczętych 100 m² nadwyżki.
                  </p>

                  <h3 className="mb-6 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    2. Ujęcie systemowe zamiast instalacyjnego
                  </h3>
                  <p className="mb-8 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    Zrezygnowano z dotychczasowego pojęcia „instalacje do grawitacyjnego odprowadzania dymu
                    i ciepła” na rzecz nazwy „systemy”. Różnica ma wymiar merytoryczny – definicja ta
                    obejmuje teraz integralnie zarówno urządzenia do usuwania dymu i gorących gazów
                    pożarowych, jak i urządzenia dostarczające powietrze kompensacyjne. Norma kładzie
                    silny nacisk na fakt, że zapewnienie napływu świeżego powietrza jest warunkiem koniecznym
                    dla skuteczności całego układu.
                  </p>

                  <h3 className="mb-6 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    3. Grupy Projektowe (GP) zamiast dawnych wzorów obliczeniowych
                  </h3>
                  <p className="mb-8 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    Zasadniczej zmianie uległa matematyczna strona wymiarowania systemu. Wycofano
                    wcześniejsze skomplikowane wzory na skorygowaną wysokość warstwy wolnej od dymu
                    (które również były korygowane w poprawce z 2006 roku) na rzecz doboru gotowych
                    wartości minimalnej powierzchni czynnej z dedykowanych tablic. System wymiaruje się na
                    podstawie przypisania strefy do jednej z pięciu <strong className="text-black dark:text-white">Grup Projektowych (GP1 - GP5)</strong>.
                    Wybór GP zależy m.in. od gęstości obciążenia ogniowego, przewidywanej szybkości
                    rozprzestrzeniania się pożaru, wysokości składowania oraz ochrony strefy za pomocą stałych
                    urządzeń gaśniczych wodnych.
                  </p>

                  <h3 className="mb-6 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    4. Ścienne urządzenia oddymiające i kompensacja powietrza
                  </h3>
                  <p className="mb-8 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    Nowa norma formalizuje zasady projektowania i rozmieszczania ściennych urządzeń
                    oddymiających, wymagając m.in. ich montażu na przeciwległych ścianach i zapewnienia
                    automatycznego otwierania od strony zawietrznej. Jednocześnie sformułowano bezwzględny
                    wymóg: łączna powierzchnia efektywna otworów kompensacyjnych w żadnym wypadku nie
                    może być mniejsza od minimalnej wymaganej powierzchni czynnej oddymiania dla danej strefy.
                  </p>

                  <h3 className="mb-6 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    5. Zdefiniowanie zasad współpracy z instalacjami tryskaczowymi
                  </h3>
                  <p className="mb-8 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    Norma z 2025 roku kompleksowo uwzględnia istnienie stałych samoczynnych urządzeń
                    gaśniczych wodnych (tryskaczy). Ich obecność ułatwia przyporządkowanie do niższej Grupy
                    Projektowej, ale nakłada ścisłe wymogi sterowania. W strefach chronionych tryskaczami
                    urządzenie oddymiające – projektowane w celu zapewnienia ewakuacji – musi uruchomić się
                    samoczynnie po sygnale od systemu sygnalizacji pożarowej, ale obligatoryjnie przed
                    zadziałaniem samej instalacji gaśniczej wodnej.
                  </p>

                  <h3 className="mb-6 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
                    6. Procedury, odbiory i awarie
                  </h3>
                  <p className="mb-10 text-base font-medium leading-relaxed text-body-color sm:text-lg sm:leading-relaxed lg:text-base lg:leading-relaxed xl:text-lg xl:leading-relaxed">
                    Zaktualizowany dokument wprowadza rygorystyczne wytyczne co do logiki sterowania oraz
                    testowania infrastruktury. Sformułowano szczegółowe zasady przeprowadzania uruchomień i
                    testów odbiorczych, a także wprowadzono obowiązek wykonywania badań okresowych co najmniej
                    raz w roku (o ile producent nie wskaże częstszych wizyt technicznych).
                  </p>

                  <div className="relative z-10 mb-10 overflow-hidden rounded-md bg-primary bg-opacity-10 p-8 md:p-9 lg:p-8 xl:p-9">
                    <p className="text-center text-base font-medium italic text-body-color">
                      Podsumowując, norma PN-B-02877-4:2025-07 to istotny krok w inżynierii bezpieczeństwa
                      pożarowego. Odejście od dotkliwego dla inwestorów limitu 2 600 m² dla stref dymowych z
                      2006 roku na rzecz nowej metodyki opartej na Grupach Projektowych dostarcza biurom
                      inżynierskim narzędzia, które są spójne, przewidywalne i elastycznie dostosowane do
                      wymagań dzisiejszych projektów logistycznych i produkcyjnych.
                    </p>
                    {/* Elementy dekoracyjne tła */}
                    <span className="absolute left-0 top-0 z-[-1]">
                      <svg width="132" height="109" viewBox="0 0 132 109" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path opacity="0.5" d="M33.0354 90.11C19.9851 102.723 -3.75916 101.834 -14 99.8125V-15H132C131.456 -12.4396 127.759 -2.95278 117.318 14.5117C104.268 36.3422 78.7114 31.8952 63.2141 41.1934C47.7169 50.4916 49.3482 74.3435 33.0354 90.11Z" fill="url(#paint0_linear_111:606)" />
                        <path opacity="0.5" d="M33.3654 85.0768C24.1476 98.7862 1.19876 106.079 -9.12343 108.011L-38.876 22.9988L100.816 -25.8905C100.959 -23.8126 99.8798 -15.5499 94.4164 0.87754C87.5871 21.4119 61.9822 26.677 49.5641 38.7512C37.146 50.8253 44.8877 67.9401 33.3654 85.0768Z" fill="url(#paint1_linear_111:606)" />
                        <defs>
                          <linearGradient id="paint0_linear_111:606" x1="94.7523" y1="82.0246" x2="8.40951" y2="52.0609" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0.06" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
                          <linearGradient id="paint1_linear_111:606" x1="90.3206" y1="58.4236" x2="1.16149" y2="50.8365" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0.06" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
                        </defs>
                      </svg>
                    </span>
                    <span className="absolute bottom-0 right-0 z-[-1]">
                      <svg width="53" height="30" viewBox="0 0 53 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle opacity="0.8" cx="37.5" cy="37.5" r="37.5" fill="#DC3545" />
                        <mask id="mask0_111:596" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="75" height="75">
                          <circle opacity="0.8" cx="37.5" cy="37.5" r="37.5" fill="#DC3545" />
                        </mask>
                        <g mask="url(#mask0_111:596)">
                          <circle opacity="0.8" cx="37.5" cy="37.5" r="37.5" fill="url(#paint0_radial_111:596)" />
                          <g opacity="0.8" filter="url(#filter0_f_111:596)">
                            <circle cx="40.8089" cy="19.853" r="15.4412" fill="white" />
                          </g>
                        </g>
                        <defs>
                          <filter id="filter0_f_111:596" x="4.36768" y="-16.5881" width="72.8823" height="72.8823" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur stdDeviation="10.5" result="effect1_foregroundBlur_111:596" />
                          </filter>
                          <radialGradient id="paint0_radial_111:596" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(37.5 37.5) rotate(90) scale(40.2574)">
                            <stop stopOpacity="0.47" />
                            <stop offset="1" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                      </svg>
                    </span>
                  </div>

                  {/* Sekcja tagów */}
                  <div className="items-center justify-between sm:flex">
                    <div className="mb-5">
                      <h4 className="mb-3 text-sm font-medium text-body-color">
                        Popularne tagi:
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <TagButton text="Normy" />
                        <TagButton text="Oddymianie" />
                        <TagButton text="PN-B-02877" />
                      </div>
                    </div>
                  </div>

                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BlogDetailsPage;