"use client";

import { useState } from "react";
import Link from "next/link";

export default function SmokeExhaustCalculatorPage() {
  const [activeTab, setActiveTab] = useState<"PN" | "CNBOP" | "VDS">("PN");
  const [area, setArea] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [result, setResult] = useState<number | null>(null);

  const calculateArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!area || !height) return;

    let calculatedArea = 0;
    const s = Number(area);

    if (activeTab === "PN") {
      calculatedArea = s * 0.02; 
    } else if (activeTab === "CNBOP") {
      calculatedArea = s * 0.025; 
    } else if (activeTab === "VDS") {
      calculatedArea = s * 0.03; 
    }

    setResult(Number(calculatedArea.toFixed(2)));
  };

  return (
    <div className="space-y-8">
      {/* Pasek powrotu i nagłówek */}
      <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark sm:p-8">
        <Link
          href="/narzedzia/kalkulatory"
          className="mb-6 inline-flex items-center text-sm font-medium text-body-color hover:text-primary dark:text-body-color-dark dark:hover:text-primary"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Powrót do listy kalkulatorów
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-black dark:text-white sm:text-3xl">
          Kalkulator oddymiania grawitacyjnego
        </h1>
        <p className="text-base font-medium leading-relaxed text-body-color dark:text-body-color-dark">
          Moduł pozwala wyznaczyć wymaganą powierzchnię czynną urządzeń oddymiających (A<sub>cz</sub>) zgodnie z trzema najpopularniejszymi standardami projektowymi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Lewa kolumna: Formularz obliczeniowy */}
        <div className="rounded-md bg-white shadow-two dark:bg-dark lg:col-span-2">
          
          {/* Nawigacja zakładkowa (Tabs) */}
          <div className="flex border-b border-body-color border-opacity-10 dark:border-white dark:border-opacity-10">
            <button
              onClick={() => { setActiveTab("PN"); setResult(null); }}
              className={`flex-1 py-4 text-center text-sm font-bold sm:text-base ${
                activeTab === "PN"
                  ? "border-b-2 border-primary text-primary"
                  : "text-body-color hover:text-black dark:text-body-color-dark dark:hover:text-white"
              }`}
            >
              Polska Norma (PN)
            </button>
            <button
              onClick={() => { setActiveTab("CNBOP"); setResult(null); }}
              className={`flex-1 py-4 text-center text-sm font-bold sm:text-base ${
                activeTab === "CNBOP"
                  ? "border-b-2 border-primary text-primary"
                  : "text-body-color hover:text-black dark:text-body-color-dark dark:hover:text-white"
              }`}
            >
              Wytyczne CNBOP
            </button>
            <button
              onClick={() => { setActiveTab("VDS"); setResult(null); }}
              className={`flex-1 py-4 text-center text-sm font-bold sm:text-base ${
                activeTab === "VDS"
                  ? "border-b-2 border-primary text-primary"
                  : "text-body-color hover:text-black dark:text-body-color-dark dark:hover:text-white"
              }`}
            >
              Wytyczne VdS
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 rounded-md bg-primary bg-opacity-5 p-4 text-sm text-primary">
              Aktywny algorytm: <strong>{activeTab === "PN" ? "PN-B-02877-4:2025-07" : activeTab === "CNBOP" ? "Wytyczne W-0003:2001 (CNBOP)" : "VdS 2098"}</strong>
            </div>

            <form onSubmit={calculateArea} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    Powierzchnia strefy dymowej [m²]
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    placeholder="np. 2000"
                    className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color placeholder-body-color shadow-one outline-none focus:border-primary focus-visible:shadow-none dark:bg-[#242B51] dark:shadow-signUp"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    Wysokość pomieszczenia [m]
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    placeholder="np. 8.5"
                    className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color placeholder-body-color shadow-one outline-none focus:border-primary focus-visible:shadow-none dark:bg-[#242B51] dark:shadow-signUp"
                  />
                </div>
              </div>

              {activeTab === "PN" && (
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    Grupa Projektowa (GP)
                  </label>
                  <select className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color placeholder-body-color shadow-one outline-none focus:border-primary focus-visible:shadow-none dark:bg-[#242B51] dark:shadow-signUp">
                    <option value="GP1">GP1 (Małe obciążenie ogniowe)</option>
                    <option value="GP2">GP2</option>
                    <option value="GP3">GP3 (Średnie obciążenie)</option>
                    <option value="GP4">GP4</option>
                    <option value="GP5">GP5 (Wysokie obciążenie, S3)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-md bg-primary px-9 py-4 text-base font-medium text-white transition duration-300 hover:bg-opacity-90"
              >
                Oblicz wymaganą powierzchnię A<sub>cz</sub>
              </button>
            </form>

            {/* Wynik obliczeń */}
            {result !== null && (
              <div className="mt-8 animate-fade-in rounded-md border border-green-500 bg-green-500 bg-opacity-10 p-6">
                <h3 className="mb-2 text-lg font-bold text-green-600 dark:text-green-400">Wynik obliczeń:</h3>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold text-black dark:text-white">{result}</span>
                  <span className="text-xl font-medium text-body-color dark:text-body-color-dark">m²</span>
                </div>
                <p className="mt-2 text-sm text-body-color dark:text-body-color-dark">
                  Minimalna sumaryczna powierzchnia czynna klap dymowych dla strefy według wytycznych {activeTab}.
                </p>
                
                <div className="mt-6 flex space-x-4 border-t border-green-500 border-opacity-20 pt-6">
                  <button className="inline-flex items-center text-sm font-bold text-green-600 hover:underline dark:text-green-400">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Generuj raport PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prawa kolumna: Afiliacja / Dobór produktów */}
        <div className="space-y-6">
          <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark sm:p-8">
            <h3 className="mb-4 border-b border-body-color border-opacity-10 pb-4 text-lg font-bold text-black dark:border-white dark:border-opacity-10 dark:text-white">
              Rekomendowany osprzęt
            </h3>
            
            {!result ? (
              <p className="text-sm font-medium text-body-color dark:text-body-color-dark">
                Wprowadź dane i kliknij &quot;Oblicz&quot;, aby system dopasował urządzenia z bazy producentów.
              </p>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <p className="text-sm font-medium text-body-color dark:text-body-color-dark">
                  Dla wyliczonej powierzchni A<sub>cz</sub> = {result} m², proponujemy następujące zestawy:
                </p>
                
                {/* Karta produktu 1 */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Mercor
                    </span>
                    <span className="text-xs font-medium text-body-color">Szybka dostawa</span>
                  </div>
                  <h4 className="mb-1 text-base font-bold text-dark dark:text-white">mcr PROLight</h4>
                  <p className="mb-3 text-sm text-body-color dark:text-body-color-dark">
                    Zestaw {Math.ceil(result / 1.5)} szt. klap o wymiarach 120x120 cm.
                  </p>
                  <Link href="/narzedzia/osprzet/mercor-prolight" className="text-sm font-bold text-primary hover:underline">
                    Pobierz kartę techniczną &rarr;
                  </Link>
                </div>

                {/* Karta produktu 2 */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-300">
                      SMAY
                    </span>
                  </div>
                  <h4 className="mb-1 text-base font-bold text-dark dark:text-white">KTS-O (Dachowe)</h4>
                  <p className="mb-3 text-sm text-body-color dark:text-body-color-dark">
                    Zestaw {Math.ceil(result / 2.0)} szt. klap o wymiarach 150x150 cm z deflektorami wiatru.
                  </p>
                  <Link href="/narzedzia/osprzet/smay-kts" className="text-sm font-bold text-primary hover:underline">
                    Pobierz kartę techniczną &rarr;
                  </Link>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}