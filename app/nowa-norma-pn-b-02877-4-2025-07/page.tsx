import Breadcrumb from "@/components/Common/Breadcrumb";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analiza nowej normy PN-B-02877-4:2025-07 | Fire Protection Solutions",
  description:
    "Zmiany w projektowaniu systemów oddymiania grawitacyjnego. Analiza nowej normy PN-B-02877-4:2025-07 na tle dotychczasowych przepisów z 2001 i 2006 roku.",
};

const BlogDetailsPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Blog"
        description="Baza wiedzy z zakresu inżynierii bezpieczeństwa pożarowego."
      />

      <section className="pb-[120px] pt-[150px]">
        <div className="container">
          <div className="-mx-4 flex flex-wrap justify-center">
            <div className="w-full px-4 lg:w-8/12">
              <article>
                <h1 className="mb-8 text-3xl font-bold leading-tight text-black dark:text-white sm:text-4xl sm:leading-tight">
                  Zmiany w projektowaniu systemów oddymiania: Analiza nowej normy
                  PN-B-02877-4:2025-07 na tle dotychczasowych przepisów
                </h1>
                
                <div className="mb-10 w-full overflow-hidden rounded-md relative aspect-[16/9]">
                  <Image
                    src="/images/blog/blog2.jpg"
                    alt="Projektowanie systemów oddymiania zgodnie z nową normą"
                    fill
                    className="object-cover object-center"
                  />
                </div>
          

                <div className="blog-details prose max-w-none prose-lg dark:prose-invert">
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
                  </div>
                  
                  <div className="mt-10 flex flex-wrap items-center justify-between border-t border-body-color border-opacity-10 pb-4 pt-10 dark:border-white dark:border-opacity-10">
                    <div className="mb-5 flex items-center">
                      <div className="mr-5 flex items-center border-r border-body-color border-opacity-10 pr-5 dark:border-white dark:border-opacity-10">
                        <div className="mr-4">
                          <div className="relative h-10 w-10 overflow-hidden rounded-full">
                            <Image
                              src="/images/blog/jakub.jpg"
                              alt="Jakub Baran"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div className="w-full">
                          <h4 className="mb-1 text-sm font-medium text-dark dark:text-white">
                            Pisał dla Ciebie
                          </h4>
                          <p className="text-xs text-body-color">Jakub Baran</p>
                        </div>
                      </div>
                      <div className="inline-block">
                        <h4 className="mb-1 text-sm font-medium text-dark dark:text-white">
                          Data
                        </h4>
                        <p className="text-xs text-body-color">13 Maja 2026</p>
                      </div>
                    </div>
                    
                    <div className="mb-5">
                      <Link
                        href="/kontakt"
                        className="inline-flex items-center justify-center rounded-sm bg-primary px-8 py-3 text-base font-semibold text-white transition duration-300 hover:bg-opacity-90"
                      >
                        Potrzebujesz projektu? Skontaktuj się
                      </Link>
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