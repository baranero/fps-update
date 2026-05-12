import Breadcrumb from "@/components/Common/Breadcrumb";
import Link from "next/link";

export const metadata = {
  title: "Polityka cookies | Fire Protection Solutions",
};

export default function PolitykaCookiesPage() {
  return (
    <>
      <Breadcrumb
        pageName="Polityka cookies"
        description="Informacje o plikach cookies i technologiach śledzących wykorzystywanych w naszym serwisie."
      />
      <main className="container pb-16 pt-16 md:pb-20 md:pt-20 lg:pb-28 lg:pt-28">
        <div className="mx-auto max-w-[800px]">
          
          <div className="mb-10">
            <h1 className="mb-6 text-3xl font-bold text-black dark:text-white sm:text-4xl">
              Polityka Cookies
            </h1>
            <p className="text-base leading-relaxed text-body-color dark:text-body-color-dark">
              Niniejsza Polityka Cookies określa zasady zapisywania i uzyskiwania dostępu do danych na urządzeniach 
              Użytkowników korzystających ze strony internetowej Fire Protection Solutions w celu świadczenia usług 
              drogą elektroniczną przez Administratora.
            </p>
          </div>

          <div className="space-y-10 text-base leading-relaxed text-body-color dark:text-body-color-dark">
            
            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 1. Informacje ogólne
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Administratorem serwisu oraz podmiotem zamieszczającym pliki cookies na urządzeniu końcowym Użytkownika jest <strong>Fire Protection Solutions Jakub Baran</strong> z siedzibą: ul. Grzybowa 7A lok. 2, 05-825 Grodzisk Mazowiecki (NIP: 6182094888).
                </li>
                <li>
                  Serwis zbiera w sposób automatyczny wyłącznie informacje zawarte w plikach cookies. Nie zbiera w sposób zautomatyzowany żadnych innych informacji o Użytkownikach.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 2. Czym są pliki cookies?
              </h2>
              <p>
                Pliki cookies (tzw. „ciasteczka”) stanowią dane informatyczne, w szczególności niewielkie pliki tekstowe, które przechowywane są w urządzeniu końcowym Użytkownika (komputerze, smartfonie, tablecie) i przeznaczone są do korzystania ze stron internetowych Serwisu. Cookies zazwyczaj zawierają nazwę strony internetowej, z której pochodzą, czas przechowywania ich na urządzeniu oraz unikalny numer.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 3. Rodzaje wykorzystywanych plików cookies
              </h2>
              <p className="mb-4">W ramach Serwisu stosowane są następujące rodzaje plików cookies:</p>
              <ul className="list-disc space-y-3 pl-5">
                <li>
                  <strong>Niezbędne (techniczne) pliki cookies:</strong> absolutnie konieczne do prawidłowego funkcjonowania strony internetowej. Zapewniają podstawowe funkcje bezpieczeństwa i dostępności Serwisu.
                </li>
                <li>
                  <strong>Analityczne / wydajnościowe pliki cookies:</strong> umożliwiają zbieranie informacji o sposobie korzystania ze strony internetowej, co pomaga nam ulepszać jej strukturę i zawartość (np. Google Analytics).
                </li>
                <li>
                  <strong>Funkcjonalne pliki cookies:</strong> umożliwiają „zapamiętanie” wybranych przez Użytkownika ustawień i personalizację interfejsu (np. w zakresie wybranego trybu jasnego/ciemnego).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 4. Zarządzanie plikami cookies
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Większość przeglądarek internetowych domyślnie dopuszcza przechowywanie plików cookies w urządzeniu końcowym Użytkownika.
                </li>
                <li>
                  Użytkownik może w każdej chwili dokonać zmiany ustawień dotyczących plików cookies. Ustawienia te mogą zostać zmienione w taki sposób, aby blokować automatyczną obsługę cookies w ustawieniach przeglądarki internetowej lub informować o ich każdorazowym zamieszczeniu w urządzeniu.
                </li>
                <li>
                  Szczegółowe informacje o możliwości i sposobach obsługi plików cookies dostępne są w ustawieniach oprogramowania (przeglądarki internetowej), np.:
                  <ul className="list-disc mt-2 space-y-1 pl-5">
                    <li>w przeglądarce Google Chrome</li>
                    <li>w przeglądarce Mozilla Firefox</li>
                    <li>w przeglądarce Safari</li>
                    <li>w przeglądarce Microsoft Edge</li>
                  </ul>
                </li>
                <li>
                  Ograniczenie stosowania plików cookies może wpłynąć na niektóre funkcjonalności dostępne na stronie internetowej Serwisu (np. brak możliwości zapamiętania preferencji trybu ciemnego).
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 5. Postanowienia końcowe i kontakt
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Więcej informacji na temat przetwarzania Twoich danych osobowych znajdziesz w naszej{" "}
                  <Link href="/polityka-prywatnosci" className="font-semibold text-primary hover:underline">
                    Polityce Prywatności
                  </Link>.
                </li>
                <li>
                  W razie pytań dotyczących polityki cookies prosimy o kontakt pod adresem e-mail:{" "}
                  <a href="mailto:biuro@fp-solutions.pl" className="font-semibold text-primary hover:underline">
                    biuro@fp-solutions.pl
                  </a>.
                </li>
              </ol>
              <p className="mt-6 font-medium italic">
                Ostatnia aktualizacja dokumentu: {new Date().toLocaleDateString('pl-PL')}
              </p>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}