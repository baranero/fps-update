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
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800 sm:p-8">
        <Link
          href="/narzedzia/kalkulatory"
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Powrót do listy kalkulatorów
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
          Kalkulator oddymiania grawitacyjnego
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Moduł pozwala wyznaczyć wymaganą powierzchnię czynną urządzeń oddymiających (A<sub>cz</sub>) zgodnie z trzema najpopularniejszymi standardami projektowymi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Lewa kolumna: Formularz obliczeniowy */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800 lg:col-span-2">

          {/* Nawigacja zakładkowa (Tabs) */}
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => { setActiveTab("PN"); setResult(null); }}
              className={`flex-1 py-4 text-center text-sm font-bold sm:text-base ${
                activeTab === "PN"
                  ? "border-b-2 border-primary text-primary"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Polska Norma (PN)
            </button>
            <button
              onClick={() => { setActiveTab("CNBOP"); setResult(null); }}
              className={`flex-1 py-4 text-center text-sm font-bold sm:text-base ${
                activeTab === "CNBOP"
                  ? "border-b-2 border-primary text-primary"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Wytyczne CNBOP
            </button>
            <button
              onClick={() => { setActiveTab("VDS"); setResult(null); }}
              className={`flex-1 py-4 text-center text-sm font-bold sm:text-base ${
                activeTab === "VDS"
                  ? "border-b-2 border-primary text-primary"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Wytyczne VdS
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 rounded-xl bg-primary/5 p-4 text-sm text-primary">
              Aktywny algorytm: <strong>{activeTab === "PN" ? "PN-B-02877-4:2025-07" : activeTab === "CNBOP" ? "Wytyczne W-0003:2001 (CNBOP)" : "VdS 2098"}</strong>
            </div>

            <form onSubmit={calculateArea} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Powierzchnia strefy dymowej [m²]
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    placeholder="np. 2000"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary dark:bg-[#1E2342] dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary dark:bg-[#1E2342] dark:border-slate-700"
                  />
                </div>
              </div>

              {activeTab === "PN" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Grupa Projektowa (GP)
                  </label>
                  <select className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary dark:bg-[#1E2342] dark:border-slate-700">
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
                className="flex w-full items-center justify-center rounded-xl bg-primary px-9 py-4 text-base font-semibold text-white transition duration-300 hover:bg-opacity-90"
              >
                Oblicz wymaganą powierzchnię A<sub>cz</sub>
              </button>
            </form>

            {/* Wynik obliczeń */}
            {result !== null && (
              <div className="mt-8 animate-fade-in rounded-2xl border border-green-500 bg-green-500/10 p-6">
                <h3 className="mb-2 text-lg font-bold text-green-600 dark:text-green-400">Wynik obliczeń:</h3>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold text-slate-950 dark:text-white">{result}</span>
                  <span className="text-xl font-medium text-slate-500 dark:text-slate-400">m²</span>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800 sm:p-8">
            <h3 className="mb-4 border-b border-slate-100 pb-4 text-lg font-bold text-slate-950 dark:border-slate-800 dark:text-white">
              Rekomendowany osprzęt
            </h3>
            
            {!result ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Wprowadź dane i kliknij &quot;Oblicz&quot;, aby system dopasował urządzenia z bazy producentów.
              </p>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Dla wyliczonej powierzchni A<sub>cz</sub> = {result} m², proponujemy następujące zestawy:
                </p>
                
                {/* Karta produktu 1 */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Mercor
                    </span>
                    <span className="text-xs font-medium text-slate-600">Szybka dostawa</span>
                  </div>
                  <h4 className="mb-1 text-base font-bold text-dark dark:text-white">mcr PROLight</h4>
                  <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
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
                  <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
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

