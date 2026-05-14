import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Inżyniera | Fire Protection Solutions",
  description: "Zaawansowane narzędzia obliczeniowe i baza osprzętu ppoż. dla profesjonalistów.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      
      {/* Nagłówek powitalny */}
      <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark sm:p-8">
        <h1 className="mb-4 text-2xl font-bold text-black dark:text-white sm:text-3xl">
          Panel Inżyniera
        </h1>
        <p className="text-base font-medium leading-relaxed text-body-color dark:text-body-color-dark">
          Wybierz narzędzie, aby rozpocząć obliczenia, lub przeglądaj bazę osprzętu certyfikowanych producentów z którymi współpracujemy.
        </p>
      </div>

      {/* Karty ze statystykami */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary bg-opacity-10 text-primary">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-body-color dark:text-body-color-dark">Kalkulatory</h2>
              <p className="text-2xl font-bold text-black dark:text-white">4</p>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 bg-opacity-10 text-blue-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-body-color dark:text-body-color-dark">Baza produktów</h2>
              <p className="text-2xl font-bold text-black dark:text-white">128</p>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500 bg-opacity-10 text-green-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-body-color dark:text-body-color-dark">Twoje Raporty</h2>
              <p className="text-2xl font-bold text-black dark:text-white">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Główne akcje / Szybki start */}
      <h2 className="text-xl font-bold text-black dark:text-white">Szybki start</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* Karta: Kalkulatory */}
        <div className="group rounded-md bg-white p-6 shadow-two transition-all duration-300 hover:shadow-lg dark:bg-dark">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary bg-opacity-10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-black dark:text-white">Kalkulatory PPOŻ</h3>
          <p className="mb-6 text-base font-medium leading-relaxed text-body-color dark:text-body-color-dark">
            Wykonuj obliczenia dla systemów oddymiania, wyznaczaj gęstość obciążenia ogniowego i dobieraj urządzenia zgodnie z normami.
          </p>
          <Link
            href="/narzedzia/kalkulatory"
            className="inline-flex items-center text-sm font-bold text-primary hover:underline"
          >
            Przejdź do kalkulatorów
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        {/* Karta: Baza osprzętu */}
        <div className="group rounded-md bg-white p-6 shadow-two transition-all duration-300 hover:shadow-lg dark:bg-dark">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 bg-opacity-10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-black dark:text-white">Baza Osprzętu</h3>
          <p className="mb-6 text-base font-medium leading-relaxed text-body-color dark:text-body-color-dark">
            Przeglądaj parametry techniczne klap, wentylatorów i central sterujących od zweryfikowanych producentów.
          </p>
          <Link
            href="/narzedzia/osprzet"
            className="inline-flex items-center text-sm font-bold text-blue-500 hover:underline"
          >
            Przeglądaj katalog
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

      </div>

      {/* Dolna sekcja: Ostatnie Raporty */}
      <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark sm:p-8">
        <h3 className="mb-6 border-b border-body-color border-opacity-10 pb-4 text-xl font-bold text-black dark:border-white dark:border-opacity-10 dark:text-white">
          Ostatnio wygenerowane PDF
        </h3>
        <ul className="divide-y divide-body-color divide-opacity-10 dark:divide-white dark:divide-opacity-10">
          <li className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-body-color dark:text-body-color-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <span className="ml-3 text-base font-medium text-black dark:text-white">Dobór_klap_Hala_A.pdf</span>
            </div>
            <span className="text-sm font-medium text-body-color dark:text-body-color-dark">Dzisiaj, 10:45</span>
          </li>
          <li className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-body-color dark:text-body-color-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <span className="ml-3 text-base font-medium text-black dark:text-white">Obciazenie_ogniowe_Magazyn.pdf</span>
            </div>
            <span className="text-sm font-medium text-body-color dark:text-body-color-dark">Wczoraj</span>
          </li>
        </ul>
        <Link href="/narzedzia/raporty" className="mt-6 inline-block text-sm font-bold text-primary hover:underline">
          Zobacz wszystkie raporty &rarr;
        </Link>
      </div>

    </div>
  );
}