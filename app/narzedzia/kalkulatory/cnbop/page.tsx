"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export default function CnbopCalculatorPage() {
  // KROK 1: Parametry podstawowe
  const [category, setCategory] = useState("ZL IV");
  const [height, setHeight] = useState("Średniowysoki");
  const [extendsRoute, setExtendsRoute] = useState("Nie");
  const [stairwellType, setStairwellType] = useState("Obudowana drzwiami przeciwpożarowymi");

  // KROK 2: Parametry klatki schodowej
  const [aks, setAks] = useState<number | "">("");
  const [aArea, setAArea] = useState<number | "">("");
  const [bArea, setBArea] = useState<number | "">("");
  const [cArea, setCArea] = useState<number | "">("");
  const [dArea, setDArea] = useState<number | "">("");

  // KROK 4: Dane aerodynamiczne (mechaniczne)
  const [ae, setAe] = useState<number | "">("");
  const [aDrzwi, setADrzwi] = useState<number | "">("");
  const [leakage, setLeakage] = useState<number>(15);

  // Stan wyników
  const [hasCalculated, setHasCalculated] = useState(false);

  // --- LOGIKA NA ŻYWO ---

  // Obliczenie AKS-O
  const akso = useMemo(() => {
    return (Number(aArea) || 0) + (Number(bArea) || 0);
  }, [aArea, bArea]);

  // Sprawdzanie flag CFD na żywo
  const cfdWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (akso > 0) {
      if (Number(cArea) > 0.1 * akso) {
        warnings.push("OSTRZEŻENIE: Wymagana analiza CFD (zbyt duże otwory międzykondygnacyjne: C > 10% (A+B)).");
      }
      if (Number(dArea) > 0.25 * akso) {
        warnings.push("OSTRZEŻENIE: Wymagana analiza CFD (zbyt duża dusza schodów: D > 25% (A+B)).");
      }
    }
    if (Number(aks) > 40) {
      warnings.push("OSTRZEŻENIE: Wymagana analiza CFD (powierzchnia całkowita klatki > 40 m²).");
    }
    return warnings;
  }, [akso, cArea, dArea, aks]);

  // Ustalenie wymaganego systemu (KROK 3)
  const systemType = useMemo(() => {
    if (category === "ZL IV") {
      if (height === "Wysoki") return "MECHANICZNY";
      if (height === "Średniowysoki" && stairwellType !== "Obudowana drzwiami przeciwpożarowymi") return "MECHANICZNY";
      return "GRAWITACYJNY"; // dla Średniowysokiego obudowanego lub Niskiego
    } else {
      // ZL I, II, III, V, PM
      if (height === "Średniowysoki" || height === "Wysoki") return "MECHANICZNY";
      if (height === "Niski" && extendsRoute === "Tak") return "MECHANICZNY";
      return "GRAWITACYJNY"; // Niski + Nie powiększa
    }
  }, [category, height, stairwellType, extendsRoute]);


  // Obliczenia końcowe (KROK 5)
  const [results, setResults] = useState<any>(null);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    
    let res: any = { type: systemType };

    if (systemType === "GRAWITACYJNY") {
      let acz = 0;
      if (category === "ZL IV" && height === "Wysoki") {
        acz = Math.max(0.075 * akso, 1.5);
      } else {
        acz = Math.max(0.05 * akso, 1.0);
      }
      res.acz = acz.toFixed(2);
    } 
    else if (systemType === "MECHANICZNY") {
      const vn_min = 0.2 * akso * 3600;
      const vn_p = 0.83 * (Number(ae) || 0) * Math.sqrt(15) * 3600;
      const vn_v = 1.0 * (Number(aDrzwi) || 0) * 3600;
      
      const vn1 = vn_min + vn_p;
      const vn2 = vn_min + vn_v;
      const vn_max = Math.max(vn1, vn2);
      const v_went = vn_max * (1 + (Number(leakage) || 0) / 100);

      res = {
        ...res,
        vn_min: vn_min.toFixed(0),
        vn_p: vn_p.toFixed(0),
        vn_v: vn_v.toFixed(0),
        vn1: vn1.toFixed(0),
        vn2: vn2.toFixed(0),
        vn_max: vn_max.toFixed(0),
        v_went: v_went.toFixed(0)
      };
    }

    setResults(res);
    setHasCalculated(true);
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
          Kalkulator wytycznych CNBOP-PIB W-0003:2016
        </h1>
        <p className="text-base font-medium leading-relaxed text-body-color dark:text-body-color-dark">
          Zautomatyzowane narzędzie do weryfikacji wymogów i obliczania parametrów systemów oddymiania klatek schodowych zgodnie z wytycznymi CNBOP-PIB W-0003:2016 wydanie 2, maj 2019.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Lewa kolumna: Formularze */}
        <div className="rounded-md bg-white shadow-two dark:bg-dark lg:col-span-2 p-6 sm:p-8">
          <form onSubmit={handleCalculate} className="space-y-10">
            
            {/* KROK 1 */}
            <section>
              <h2 className="mb-6 border-b border-body-color border-opacity-10 pb-2 text-xl font-bold text-black dark:border-white dark:border-opacity-10 dark:text-white">
                Krok 1: Parametry podstawowe
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">Kategoria zagrożenia ludzi</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-transparent px-5 py-3 text-sm text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51]">
                    <option value="ZL I">ZL I</option>
                    <option value="ZL II">ZL II</option>
                    <option value="ZL III">ZL III</option>
                    <option value="ZL IV">ZL IV</option>
                    <option value="ZL V">ZL V</option>
                    <option value="PM">PM (Produkcyjno-Magazynowy)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">Wysokość budynku</label>
                  <select value={height} onChange={(e) => setHeight(e.target.value)} className="w-full rounded-md border border-transparent px-5 py-3 text-sm text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51]">
                    <option value="Niski">Niski (N)</option>
                    <option value="Średniowysoki">Średniowysoki (SW)</option>
                    <option value="Wysoki">Wysoki (W) / Wysokościowy (WW)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">Powiększa dojście ewakuacyjne?</label>
                  <div className="flex space-x-4 pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" value="Tak" checked={extendsRoute === "Tak"} onChange={(e) => setExtendsRoute(e.target.value)} className="text-primary" />
                      <span className="text-sm text-body-color dark:text-body-color-dark">Tak</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" value="Nie" checked={extendsRoute === "Nie"} onChange={(e) => setExtendsRoute(e.target.value)} className="text-primary" />
                      <span className="text-sm text-body-color dark:text-body-color-dark">Nie</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">Typ klatki schodowej</label>
                  <select value={stairwellType} onChange={(e) => setStairwellType(e.target.value)} className="w-full rounded-md border border-transparent px-5 py-3 text-sm text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51]">
                    <option value="Obudowana drzwiami przeciwpożarowymi">Obudowana z drzwiami PPOŻ</option>
                    <option value="Nieobudowana lub drzwi bez odporności">Nieobudowana / Brak drzwi PPOŻ</option>
                  </select>
                </div>
              </div>
            </section>

            {/* KOMUNIKAT Z KROKU 3 */}
            <div className={`rounded-lg border-l-4 p-4 ${systemType === "MECHANICZNY" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"}`}>
              <p className={`text-sm font-bold ${systemType === "MECHANICZNY" ? "text-blue-800 dark:text-blue-300" : "text-emerald-800 dark:text-emerald-300"}`}>
                Decyzja algorytmu: Na podstawie wytycznych CNBOP-PIB wymagany jest SYSTEM {systemType}.
              </p>
            </div>

            {/* KROK 2 */}
            <section>
              <h2 className="mb-6 border-b border-body-color border-opacity-10 pb-2 text-xl font-bold text-black dark:border-white dark:border-opacity-10 dark:text-white">
                Krok 2: Powierzchnia obliczeniowa klatki schodowej
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">A<sub>KS</sub> - Całkowita pow. klatki na największej kondygnacji [m²]</label>
                  <input type="number" step="0.1" required value={aks} onChange={(e) => setAks(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">A - Sumaryczna pow. rzutu biegów [m²]</label>
                  <p className="mb-2 text-xs text-body-color">Bazuj na rzecz. szerokości biegu (x).</p>
                  <input type="number" step="0.1" required value={aArea} onChange={(e) => setAArea(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">B - Sumaryczna pow. spoczników [m²]</label>
                  <p className="mb-2 text-xs text-body-color">Bazuj na min. wymaganej szer. spocznika (y).</p>
                  <input type="number" step="0.1" required value={bArea} onChange={(e) => setBArea(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">C - Pow. pozostałych otworów [m²]</label>
                  <input type="number" step="0.1" required value={cArea} onChange={(e) => setCArea(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">D - Powierzchnia duszy schodów [m²]</label>
                  <input type="number" step="0.1" required value={dArea} onChange={(e) => setDArea(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                </div>
              </div>

              {/* Live AKS-O Result & Live Warnings */}
              <div className="mt-6 rounded-md bg-gray-100 p-4 dark:bg-gray-800">
                <p className="text-lg font-bold text-black dark:text-white">
                  Obliczona wartość A<sub>KS-O</sub> = {akso.toFixed(2)} m²
                </p>
                {cfdWarnings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {cfdWarnings.map((warn, i) => (
                      <p key={i} className="text-sm font-bold text-red-600 dark:text-red-400 flex items-start">
                         <svg className="h-5 w-5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        {warn}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* KROK 4 */}
            {systemType === "MECHANICZNY" && (
              <section className="animate-fade-in">
                <h2 className="mb-6 border-b border-body-color border-opacity-10 pb-2 text-xl font-bold text-black dark:border-white dark:border-opacity-10 dark:text-white">
                  Krok 4: Dane aerodynamiczne
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">A<sub>e</sub> - Efektywna pow. nieszczelności [m²]</label>
                    <input type="number" step="0.01" required value={ae} onChange={(e) => setAe(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">A<sub>drzwi</sub> - Pow. otwartych drzwi [m²]</label>
                    <input type="number" step="0.01" required value={aDrzwi} onChange={(e) => setADrzwi(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Przecieki kanałów nawiewnych [%]</label>
                    <input type="number" min="0" max="100" required value={leakage} onChange={(e) => setLeakage(Number(e.target.value))} className="w-full rounded-md px-5 py-3 text-sm shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:text-white" />
                  </div>
                </div>
              </section>
            )}

            <button type="submit" className="flex w-full items-center justify-center rounded-md bg-primary px-9 py-4 text-base font-bold text-white transition duration-300 hover:bg-opacity-90">
              Generuj Raport Obliczeniowy
            </button>
          </form>
        </div>

        {/* Prawa kolumna: Karta Wyników (Raport) i Ostrzeżenia */}
        <div className="space-y-6">
          <div className="rounded-md bg-white p-6 shadow-two dark:bg-dark sm:p-8">
            <h3 className="mb-4 border-b border-body-color border-opacity-10 pb-4 text-lg font-bold text-black dark:border-white dark:border-opacity-10 dark:text-white">
              Krok 5: Raport Inżynierski
            </h3>
            
            {!hasCalculated ? (
              <p className="text-sm font-medium text-body-color dark:text-body-color-dark">
                Uzupełnij parametry i uruchom algorytm, aby wygenerować kartę wyników do dokumentacji.
              </p>
            ) : (
              <div className="space-y-6 animate-fade-in">
                
                {results.type === "GRAWITACYJNY" && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <h4 className="mb-4 text-base font-bold text-emerald-800 dark:text-emerald-300">System Grawitacyjny</h4>
                    <div className="space-y-3">
                      <p className="flex justify-between text-sm text-black dark:text-white">
                        <span>A<sub>cz</sub> klap dymowych:</span>
                        <span className="font-bold">{results.acz} m²</span>
                      </p>
                      <p className="flex justify-between text-sm text-black dark:text-white">
                        <span>A<sub>cz_komp</sub> napływu:</span>
                        <span className="font-bold">≥ {results.acz} m²</span>
                      </p>
                      <div className="mt-4 border-t border-emerald-200 pt-3 dark:border-emerald-700">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                          <strong>Wymóg geometryczny:</strong> Jeśli kompensacja odbywa się przez otwarte pod kątem 90° drzwi, ich pow. geometryczna musi spełniać A<sub>komp_geom</sub> ≥ 1,3 × A<sub>odd_geom</sub>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {results.type === "MECHANICZNY" && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <h4 className="mb-4 text-base font-bold text-blue-800 dark:text-blue-300">System z Nawiewem Mechanicznym</h4>
                    <div className="space-y-2 divide-y divide-blue-200 dark:divide-blue-800">
                      <p className="flex justify-between py-1 text-sm text-black dark:text-white">
                        <span>V<sub>n_min</sub> (Prędkość 0,2 m/s)</span>
                        <span className="font-bold">{results.vn_min} m³/h</span>
                      </p>
                      <p className="flex justify-between py-1 text-sm text-black dark:text-white">
                        <span>V<sub>n_p</sub> (Różnica ciśnień 15 Pa)</span>
                        <span className="font-bold">{results.vn_p} m³/h</span>
                      </p>
                      <p className="flex justify-between py-1 text-sm text-black dark:text-white">
                        <span>V<sub>n_v</sub> (Otwarta kondygnacja)</span>
                        <span className="font-bold">{results.vn_v} m³/h</span>
                      </p>
                      <p className="flex justify-between py-1 text-sm text-black dark:text-white">
                        <span>V<sub>n1</sub> (Składowa zamknięta)</span>
                        <span className="font-bold">{results.vn1} m³/h</span>
                      </p>
                      <p className="flex justify-between py-1 text-sm text-black dark:text-white">
                        <span>V<sub>n2</sub> (Składowa otwarta)</span>
                        <span className="font-bold">{results.vn2} m³/h</span>
                      </p>
                      <div className="pt-3">
                        <p className="flex justify-between text-base font-bold text-blue-900 dark:text-blue-200">
                          <span>Wydajność max (V<sub>n_max</sub>)</span>
                          <span>{results.vn_max} m³/h</span>
                        </p>
                        <p className="mt-1 flex justify-between text-base font-black text-primary">
                          <span>Wentylator z przeciekami (V<sub>went</sub>)</span>
                          <span>{results.v_went} m³/h</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button className="flex w-full items-center justify-center rounded-md bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-opacity-80 dark:bg-white dark:text-black">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Pobierz PDF dla rzeczoznawcy
                </button>
              </div>
            )}
          </div>

          {/* KROK 6: Wymagania dodatkowe i Flagi CFD */}
          {hasCalculated && (
            <div className="animate-fade-in space-y-6">
              
              {cfdWarnings.length > 0 && (
                <div className="rounded-md border-2 border-red-500 bg-red-50 p-6 dark:bg-red-900/20">
                  <h3 className="mb-3 flex items-center text-lg font-black text-red-700 dark:text-red-400">
                    <svg className="mr-2 h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    UWAGA KRYTYCZNA
                  </h3>
                  <p className="text-sm font-bold text-red-600 dark:text-red-300">
                    Zaprojektowana geometria klatki wymaga weryfikacji przyjętych rozwiązań systemu za pomocą symulacji CFD zgodnie z Wytycznymi CNBOP-PIB!
                  </p>
                </div>
              )}

              <div className="rounded-md bg-gray-50 p-6 dark:bg-gray-800/50">
                <h3 className="mb-4 text-sm font-bold text-black dark:text-white">Zweryfikuj z architektem:</h3>
                <ul className="space-y-2 text-sm text-body-color dark:text-body-color-dark list-disc pl-4">
                  <li>Czy długość korytarza nie przekracza 10 m?</li>
                  <li>Czy szerokość korytarza nie przekracza 3 m?</li>
                  <li>Czy dojście do klatki z pomieszczeń nie przekracza 5 m?</li>
                </ul>
              </div>

              {/* Sekcja Partnerów (Osprzęt) */}
              <div className="rounded-md border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-dark">
                <h3 className="mb-4 text-sm font-bold text-black dark:text-white">Dobór osprzętu od partnerów</h3>
                {systemType === "MECHANICZNY" ? (
                  <div className="rounded-lg border border-gray-100 p-3 hover:shadow-md dark:border-gray-700">
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs font-bold text-red-600">SMAY</span>
                    </div>
                    <h4 className="text-sm font-bold text-dark dark:text-white">Zestaw nawiewny iSWAY</h4>
                    <p className="text-xs text-body-color mt-1">Dopasowany do wydajności V<sub>went</sub> = {results?.v_went} m³/h.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-100 p-3 hover:shadow-md dark:border-gray-700">
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs font-bold text-blue-600">Mercor</span>
                    </div>
                    <h4 className="text-sm font-bold text-dark dark:text-white">Klapy mcr PROlight</h4>
                    <p className="text-xs text-body-color mt-1">Pow. czynna sumaryczna A<sub>cz</sub> = {results?.acz} m².</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}