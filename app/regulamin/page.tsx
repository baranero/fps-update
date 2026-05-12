import Breadcrumb from "@/components/Common/Breadcrumb";
import Link from "next/link";

export const metadata = {
  title: "Regulamin | Fire Protection Solutions",
};

export default function RegulaminPage() {
  return (
    <>
      <Breadcrumb
        pageName="Regulamin Serwisu"
        description="Zasady korzystania ze strony internetowej oraz warunki świadczenia usług drogą elektroniczną."
      />
      <main className="container pb-16 pt-16 md:pb-20 md:pt-20 lg:pb-28 lg:pt-28">
        <div className="mx-auto max-w-[800px]">
          
          <div className="mb-10">
            <h1 className="mb-6 text-3xl font-bold text-black dark:text-white sm:text-4xl">
              Regulamin Serwisu Internetowego
            </h1>
            <p className="text-base leading-relaxed text-body-color dark:text-body-color-dark">
              Niniejszy regulamin określa ogólne warunki, zasady oraz sposób korzystania ze strony internetowej 
              Fire Protection Solutions. Regulamin ten jest dokumentem, o którym mowa w art. 8 Ustawy z dnia 
              18 lipca 2002 r. o świadczeniu usług drogą elektroniczną.
            </p>
          </div>

          <div className="space-y-10 text-base leading-relaxed text-body-color dark:text-body-color-dark">
            
            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 1. Postanowienia ogólne
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Właścicielem i Administratorem serwisu internetowego jest firma <strong>Fire Protection Solutions Jakub Baran</strong>, z siedzibą: <strong>ul. Grzybowa 7A lok. 2, 05-825 Grodzisk Mazowiecki</strong>.
                </li>
                <li>
                  Firma wpisana jest do CEIDG, posiada <strong>NIP: 6182094888</strong> oraz <strong>REGON: 528892780</strong>.
                </li>
                <li>
                  Kontakt z Usługodawcą możliwy jest za pośrednictwem poczty elektronicznej: <a href="mailto:biuro@fp-solutions.pl" className="font-medium text-primary hover:underline">biuro@fp-solutions.pl</a> oraz pod numerem telefonu: <a href="tel:+48790782993" className="font-medium text-primary hover:underline">+48 790 782 993</a>.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 2. Definicje
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li><strong>Serwis</strong> – strona internetowa dostępna pod domeną fp-solutions.pl (lub odpowiednią inną domeną główną).</li>
                <li><strong>Usługodawca</strong> – Fire Protection Solutions Jakub Baran.</li>
                <li><strong>Użytkownik</strong> – każda osoba fizyczna, osoba prawna lub jednostka organizacyjna korzystająca z Serwisu.</li>
                <li><strong>Usługi elektroniczne</strong> – usługi świadczone drogą elektroniczną przez Usługodawcę na rzecz Użytkownika za pośrednictwem Serwisu (np. formularz kontaktowy).</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 3. Rodzaj i zakres świadczonych usług
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Serwis ma charakter przede wszystkim informacyjny. Prezentuje on ofertę Usługodawcy z zakresu <strong>inżynierii bezpieczeństwa pożarowego</strong> (m.in. Instrukcje Bezpieczeństwa Pożarowego, symulacje CFD, audyty).
                </li>
                <li>
                  Usługodawca świadczy za pośrednictwem Serwisu bezpłatne usługi drogą elektroniczną, polegające na umożliwieniu Użytkownikom wysyłania wiadomości za pomocą interaktywnych linków e-mail oraz (jeśli dotyczy) formularzy kontaktowych.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 4. Wymagania techniczne i zasady korzystania
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Do prawidłowego korzystania z Serwisu wymagane jest urządzenie końcowe z dostępem do sieci Internet oraz standardowa przeglądarka internetowa (np. Chrome, Firefox, Safari, Edge).
                </li>
                <li>
                  Użytkownik zobowiązany jest do korzystania z Serwisu w sposób zgodny z prawem i dobrymi obyczajami, mając na uwadze poszanowanie dóbr osobistych oraz praw autorskich i własności intelektualnej Usługodawcy oraz osób trzecich.
                </li>
                <li>Obowiązuje zakaz dostarczania przez Użytkownika treści o charakterze bezprawnym.</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 5. Własność intelektualna
              </h2>
              <p className="leading-relaxed">
                Wszelkie prawa do Serwisu, w tym majątkowe prawa autorskie, prawa własności intelektualnej do jego nazwy, domeny internetowej, a także do wzorców, formularzy, logotypów i zdjęć zamieszczanych w Serwisie (z wyjątkiem materiałów na licencjach zewnętrznych) należą do Usługodawcy. Korzystanie z nich może następować wyłącznie w sposób określony i zgodny z Regulaminem lub za wyraźną, pisemną zgodą Usługodawcy.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 6. Odpowiedzialność
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Informacje zawarte w Serwisie mają charakter ogólny i nie stanowią wiążącej oferty handlowej w rozumieniu przepisów Kodeksu cywilnego, a jedynie zaproszenie do podjęcia negocjacji.
                </li>
                <li>
                  Usługodawca nie ponosi odpowiedzialności za decyzje podjęte przez Użytkownika na podstawie materiałów i informacji prezentowanych w Serwisie bez uprzedniej bezpośredniej konsultacji i zawarcia właściwej umowy na usługi inżynieryjne.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 7. Postępowanie reklamacyjne
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Użytkownik może złożyć reklamację dotyczącą funkcjonowania Serwisu oraz usług świadczonych drogą elektroniczną.
                </li>
                <li>
                  Reklamacje należy składać drogą elektroniczną na adres: <strong>biuro@fp-solutions.pl</strong>.
                </li>
                <li>
                  Usługodawca rozpatruje reklamacje niezwłocznie, nie później niż w terminie 14 dni od dnia jej otrzymania, informując Użytkownika o wynikach postępowania na adres e-mail, z którego przesłano zgłoszenie.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                § 8. Postanowienia końcowe
              </h2>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  W sprawach nieuregulowanych w niniejszym Regulaminie mają zastosowanie powszechnie obowiązujące przepisy prawa polskiego.
                </li>
                <li>
                  Usługodawca zastrzega sobie prawo do dokonywania zmian Regulaminu z ważnych przyczyn (np. zmiany przepisów prawa, zmiany sposobów świadczenia usług). O zmianach Użytkownicy będą informowani poprzez publikację nowej treści w Serwisie.
                </li>
                <li>
                  Kwestie związane z przetwarzaniem danych osobowych oraz plikami cookies zostały szczegółowo uregulowane w odrębnych dokumentach:{" "}
                  <Link href="/polityka-prywatnosci" className="font-semibold text-primary hover:underline">Polityce Prywatności</Link> oraz{" "}
                  <Link href="/polityka-cookies" className="font-semibold text-primary hover:underline">Polityce Cookies</Link>.
                </li>
              </ol>
              <p className="mt-6 font-medium italic">
                Regulamin wchodzi w życie z dniem publikacji. Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
              </p>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}