import Breadcrumb from "@/components/Common/Breadcrumb";
import Link from "next/link";

export const metadata = {
  title: "Polityka prywatności | Fire Protection Solutions",
};

export default function PolitykaPrywatnosciPage() {
  return (
    <>
      <Breadcrumb
        pageName="Polityka prywatności"
        description="Dokument określający zasady przetwarzania i ochrony danych osobowych Użytkowników."
      />
      <main className="container pb-16 pt-16 md:pb-20 md:pt-20 lg:pb-28 lg:pt-28">
        <div className="mx-auto max-w-[800px]">
          
          <div className="mb-10">
            <h1 className="mb-6 text-3xl font-bold text-black dark:text-white sm:text-4xl">
              Polityka Prywatności
            </h1>
            <p className="text-base leading-relaxed text-body-color dark:text-body-color-dark">
              Niniejsza Polityka Prywatności zawiera informacje ogólne dotyczące przetwarzania danych osobowych 
              odwiedzających stronę internetową oraz klientów korzystających z usług firmy Fire Protection Solutions. 
              Dokument ten został przygotowany w oparciu o przepisy Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 
              z dnia 27 kwietnia 2016 r. (RODO).
            </p>
          </div>

          <div className="space-y-10 text-base leading-relaxed text-body-color dark:text-body-color-dark">
            
            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 1. Administrator Danych Osobowych
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Administratorem Twoich danych osobowych jest firma <strong>Fire Protection Solutions Jakub Baran</strong>, z siedzibą pod adresem: <strong>ul. Grzybowa 7A lok. 2, 05-825 Grodzisk Mazowiecki</strong>.
                </li>
                <li>
                  Firma wpisana jest do Centralnej Ewidencji i Informacji o Działalności Gospodarczej (CEIDG), posiadająca <strong>NIP: 6182094888</strong> oraz <strong>REGON: 528892780</strong>.
                </li>
                <li>
                  Kontakt z Administratorem w sprawach związanych z ochroną danych osobowych jest możliwy za pośrednictwem poczty elektronicznej pod adresem e-mail: <a href="mailto:biuro@fp-solutions.pl" className="font-medium text-primary hover:underline">biuro@fp-solutions.pl</a>.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 2. Cele, podstawy prawne oraz czas przetwarzania danych
              </h2>
              <p className="mb-4">Administrator przetwarza dane osobowe w następujących celach:</p>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  <strong>Kontakt i obsługa zapytań</strong> – na podstawie art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora). Dane (np. imię, nazwisko, e-mail, numer telefonu) przetwarzane są w celu udzielenia odpowiedzi na zapytania przesłane przez formularz lub drogą mailową. Dane te są przechowywane przez okres niezbędny do obsługi zapytania.
                </li>
                <li>
                  <strong>Realizacja usług z zakresu inżynierii bezpieczeństwa pożarowego</strong> (m.in. Instrukcje Bezpieczeństwa Pożarowego, symulacje CFD, audyty, operaty) – na podstawie art. 6 ust. 1 lit. b RODO (niezbędność do wykonania umowy). Dane przetwarzane są przez czas trwania umowy oraz do momentu przedawnienia roszczeń z niej wynikających.
                </li>
                <li>
                  <strong>Wypełnienie obowiązków prawnych</strong> (księgowość, podatki) – na podstawie art. 6 ust. 1 lit. c RODO. Dane przechowywane są przez okres wymagany powszechnie obowiązującymi przepisami prawa (zazwyczaj 5 lat od końca roku kalendarzowego, w którym upłynął termin płatności podatku).
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 3. Odbiorcy danych osobowych
              </h2>
              <p className="mb-4">
                Dla prawidłowego funkcjonowania strony oraz realizacji świadczonych usług z zakresu bezpieczeństwa pożarowego, Administrator korzysta z usług podmiotów zewnętrznych. Dane mogą być przekazywane:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>biuru rachunkowemu obsługującemu Administratora;</li>
                <li>dostawcom usług hostingowych oraz poczty elektronicznej;</li>
                <li>podmiotom dostarczającym oprogramowanie do zarządzania firmą i projektami inżynieryjnymi;</li>
                <li>organom państwowym (np. Urząd Skarbowy), jeżeli wynika to z obowiązujących przepisów prawa.</li>
              </ul>
              <p className="mt-4">
                Administrator powierza dane wyłącznie podmiotom gwarantującym stosowanie odpowiednich środków ochrony i bezpieczeństwa danych osobowych, wymaganych przez przepisy prawa.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 4. Prawa osób, których dane dotyczą
              </h2>
              <p className="mb-4">Zgodnie z przepisami RODO, każdemu Użytkownikowi przysługuje:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li><strong>Prawo dostępu</strong> do swoich danych oraz otrzymania ich kopii;</li>
                <li><strong>Prawo do sprostowania</strong> (poprawiania) swoich danych;</li>
                <li><strong>Prawo do usunięcia danych</strong> (jeżeli nie ma podstaw do tego, aby były przetwarzane);</li>
                <li><strong>Prawo do ograniczenia przetwarzania</strong> danych osobowych;</li>
                <li><strong>Prawo do przenoszenia danych</strong> osobowych;</li>
                <li><strong>Prawo do wniesienia sprzeciwu</strong> wobec przetwarzania danych opartego na prawnie uzasadnionym interesie Administratora.</li>
              </ul>
              <p className="mt-4">
                Ponadto Użytkownik ma prawo wniesienia skargi do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych (PUODO), jeżeli uzna, że przetwarzanie jego danych narusza przepisy prawa.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 5. Bezpieczeństwo danych
              </h2>
              <p>
                Administrator stosuje odpowiednie środki techniczne i organizacyjne zapewniające ochronę przetwarzanych danych osobowych, adekwatne do zagrożeń oraz kategorii danych objętych ochroną. W szczególności zabezpiecza dane przed ich udostępnieniem osobom nieupoważnionym, zabraniem przez osobę nieuprawnioną, przetwarzaniem z naruszeniem obowiązujących przepisów oraz zmianą, utratą, uszkodzeniem lub zniszczeniem (m.in. poprzez stosowanie certyfikatów SSL na stronie).
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 6. Pliki cookies i technologie śledzące
              </h2>
              <p>
                Strona internetowa zbiera w sposób automatyczny wyłącznie informacje zawarte w plikach cookies (ciasteczkach). Służą one do prawidłowego działania witryny, celów statystycznych oraz analitycznych. Szczegółowe zasady korzystania z plików cookies oraz zarządzania nimi opisane są w odrębnym dokumencie:{" "}
                <Link href="/polityka-cookies" className="font-semibold text-primary hover:underline">
                  Polityka Cookies
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 7. Postanowienia końcowe
              </h2>
              <p>
                Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności. Zmiany mogą wynikać z rozwoju technologii internetowej, zmian w powszechnie obowiązującym prawie oraz rozwoju usług inżynierii bezpieczeństwa pożarowego świadczonych przez firmę. O wszelkich zmianach Użytkownicy będą informowani w sposób widoczny i zrozumiały na niniejszej stronie.
              </p>
              <p className="mt-4 font-medium italic">
                Ostatnia aktualizacja dokumentu: {new Date().toLocaleDateString('pl-PL')}
              </p>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}