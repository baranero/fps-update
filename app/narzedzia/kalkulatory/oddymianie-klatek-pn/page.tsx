"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Tooltip from "@/components/Calculators/ui/Tooltip";
import { TrashIcon } from "@/components/Calculators/ui/Icons";
import { toNum } from "@/lib/calculations/cnbop";

type BuildingType = "niskie_sredniowysokie" | "wysokie";
type SeriesOpenings = "1" | "2" | "3";

interface VentData {
  id: number;
  width: string;
  length: string;
  cv: string;
}

interface InletData {
  id: number;
  width: string;
  height: string;
  count: string;
  cz: string;
}

export default function PnStaircaseDynamicCalculatorPage() {
  const [buildingType, setBuildingType] = useState<BuildingType>("niskie_sredniowysokie");
  const [areaK, setAreaK] = useState<string>("20");
  const [seriesOpenings, setSeriesOpenings] = useState<SeriesOpenings>("1");

  const [vents, setVents] = useState<VentData[]>([
    { id: Date.now(), width: "1.2", length: "1.2", cv: "0.60" }
  ]);
  
  const [inlets, setInlets] = useState<InletData[]>([
    { id: Date.now() + 1, width: "0.9", height: "2.0", count: "1", cz: "0.70" }
  ]);

  const [hasCalculated, setHasCalculated] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const addVent = () => setVents(p => [...p, { id: Date.now(), width: "", length: "", cv: "0.60" }]);
  const removeVent = (id: number) => setVents(p => p.filter(v => v.id !== id));
  const updateVent = (id: number, field: keyof VentData, val: string) => 
    setVents(p => p.map(v => v.id === id ? { ...v, [field]: val.replace(/[^0-9.,]/g, "") } : v));

  const addInlet = () => setInlets(p => [...p, { id: Date.now(), width: "", height: "", count: "1", cz: "0.70" }]);
  const removeInlet = (id: number) => setInlets(p => p.filter(i => i.id !== id));
  const updateInlet = (id: number, field: keyof InletData, val: string) => 
    setInlets(p => p.map(i => i.id === id ? { ...i, [field]: val.replace(/[^0-9.,]/g, "") } : i));

  const calculateResults = () => {
    const ak = toNum(areaK);
    if (ak <= 0) return null;

    let percent = buildingType === "wysokie" ? 0.075 : 0.05;
    let minAcz = buildingType === "wysokie" ? 1.5 : 1.0;

    const computedAczRaw = ak * percent;
    const requiredAcz = Math.max(computedAczRaw, minAcz);

    // Obliczenia rzeczywiste klap
    let actualGeomAcz = 0;
    let actualAcz = 0;
    vents.forEach(v => {
      const a = toNum(v.width) * toNum(v.length);
      actualGeomAcz += a;
      actualAcz += a * toNum(v.cv);
    });

    const ventsPass = actualAcz >= requiredAcz;

    // Obliczenia kompensacji
    let compensationType = buildingType === "wysokie" ? "MECHANICZNE" : "GRAWITACYJNE";
    let compMultiplier = 1.0;
    if (seriesOpenings === "2") compMultiplier = 1.30;
    if (seriesOpenings === "3") compMultiplier = 1.50;
    
    // Zgodnie z normą, liczymy % od wymaganej A_odd_klatka
    const requiredCompEffArea = requiredAcz * compMultiplier;

    let actualCompEffArea = 0;
    inlets.forEach(i => {
      const a = toNum(i.width) * toNum(i.height) * toNum(i.count);
      actualCompEffArea += a * toNum(i.cz);
    });

    const compPass = buildingType === "wysokie" ? true : actualCompEffArea >= requiredCompEffArea;

    return {
      ak,
      requiredAcz,
      actualGeomAcz,
      actualAcz,
      ventsPass,
      compensationType,
      compMultiplier,
      requiredCompEffArea,
      actualCompEffArea,
      compPass,
      minApplied: requiredAcz > computedAczRaw
    };
  };

  const results = calculateResults();

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setHasCalculated(true);
    setTimeout(() => {
      if (resultsRef.current) {
        const y = resultsRef.current.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120]">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/narzedzia/kalkulatory" className="mb-8 inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400">
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Powrót do kalkulatorów
        </Link>

        <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800">
          <h1 className="mb-4 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
            Weryfikator Oddymiania Klatek PN-B-02877-4
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kompleksowe narzędzie weryfikujące projektowane klapy i otwory napowietrzające zgodnie z normą <strong className="text-primary">PN-B-02877-4:2025-07</strong>.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800">
          <form onSubmit={handleCalculate} className="space-y-8">
            
            {/* PARAMETRY BUDYNKU */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-950 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">1. Parametry geometryczne klatki</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Typ budynku wg normy <span className="text-primary">*</span></label>
                  <select
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value as BuildingType)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary dark:bg-[#1E2342] dark:border-slate-700"
                  >
                    <option value="niskie_sredniowysokie">Niski / Średniowysoki (N, SW)</option>
                    <option value="wysokie">Wysoki (W)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Rzut poziomy klatki (<Tooltip text="Największa pow. rzutu poziomego podłogi z uwzględnieniem wszystkich kondygnacji.">A<sub>k</sub></Tooltip>) [m²] <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text" inputMode="decimal" required value={areaK} onChange={(e) => setAreaK(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary dark:bg-[#1E2342] dark:border-slate-700"
                  />
                </div>
              </div>
            </section>

            {/* URZĄDZENIA ODDYMIAJĄCE */}
            <section>
              <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2 dark:border-slate-800">
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">2. Urządzenia oddymiające</h2>
                <button type="button" onClick={addVent} className="text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition">+ Dodaj klapę</button>
              </div>
              <div className="space-y-3">
                {vents.map((v, idx) => (
                  <div key={v.id} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <span className="font-bold text-slate-400">{idx+1}.</span>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">Szerokość [m]</label>
                      <input type="text" inputMode="decimal" value={v.width} onChange={e => updateVent(v.id, "width", e.target.value)} className="w-full text-sm border-slate-200 border rounded-lg p-2 dark:bg-[#1E2342] dark:border-slate-700" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">Długość [m]</label>
                      <input type="text" inputMode="decimal" value={v.length} onChange={e => updateVent(v.id, "length", e.target.value)} className="w-full text-sm border-slate-200 border rounded-lg p-2 dark:bg-[#1E2342] dark:border-slate-700" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">C<sub>v</sub></label>
                      <input type="text" inputMode="decimal" value={v.cv} onChange={e => updateVent(v.id, "cv", e.target.value)} className="w-full text-sm border-slate-200 border rounded-lg p-2 dark:bg-[#1E2342] dark:border-slate-700" />
                    </div>
                    <button type="button" onClick={() => removeVent(v.id)} disabled={vents.length === 1} className="text-red-500 hover:text-red-700 disabled:opacity-30 p-2"><TrashIcon /></button>
                  </div>
                ))}
              </div>
            </section>

            {/* URZĄDZENIA NAPOWIETRZAJĄCE */}
            {buildingType === "niskie_sredniowysokie" && (
              <section>
                <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white">3. Otwory napowietrzające</h2>
                    <p className="text-xs text-slate-500 mt-1">Kompensacja musi równoważyć wymaganą czynną powierzchnię oddymiania.</p>
                  </div>
                  <button type="button" onClick={addInlet} className="text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition">+ Dodaj otwór</button>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Charakter układu kompensacyjnego (wpływa na wymagania)</label>
                  <select
                    value={seriesOpenings}
                    onChange={(e) => setSeriesOpenings(e.target.value as SeriesOpenings)}
                    className="w-full sm:w-1/2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary dark:bg-[#1E2342] dark:border-slate-700"
                  >
                    <option value="1">1 otwór (bezpośrednio na zewnątrz) - req: 100%</option>
                    <option value="2">2 otwory w układzie szeregowym (np. przedsionek) - req: 130%</option>
                    <option value="3">3 otwory w układzie szeregowym - req: 150%</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {inlets.map((i, idx) => (
                    <div key={i.id} className="flex flex-col sm:flex-row items-center gap-3 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl">
                      <span className="font-bold text-amber-600 dark:text-amber-500">{idx+1}.</span>
                      <div className="w-full sm:w-20">
                        <label className="block text-[10px] uppercase text-slate-500 mb-1">Ilość</label>
                        <input type="number" min="1" value={i.count} onChange={e => updateInlet(i.id, "count", e.target.value)} className="w-full text-sm border-slate-200 border rounded-lg p-2 dark:bg-[#1E2342] dark:border-slate-700" />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] uppercase text-slate-500 mb-1">Szer. [m]</label>
                        <input type="text" inputMode="decimal" value={i.width} onChange={e => updateInlet(i.id, "width", e.target.value)} className="w-full text-sm border-slate-200 border rounded-lg p-2 dark:bg-[#1E2342] dark:border-slate-700" />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] uppercase text-slate-500 mb-1">Wys. [m]</label>
                        <input type="text" inputMode="decimal" value={i.height} onChange={e => updateInlet(i.id, "height", e.target.value)} className="w-full text-sm border-slate-200 border rounded-lg p-2 dark:bg-[#1E2342] dark:border-slate-700" />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] uppercase text-slate-500 mb-1">C<sub>z</sub></label>
                        <input type="text" inputMode="decimal" value={i.cz} onChange={e => updateInlet(i.id, "cz", e.target.value)} className="w-full text-sm border-slate-200 border rounded-lg p-2 dark:bg-[#1E2342] dark:border-slate-700" />
                      </div>
                      <button type="button" onClick={() => removeInlet(i.id)} disabled={inlets.length === 1} className="text-red-500 hover:text-red-700 disabled:opacity-30 p-2"><TrashIcon /></button>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-500 italic mt-2">Wskazówka: Typowy współczynnik Cz dla otwartych drzwi wynosi 0.70. Dla okien uchylnych 0.30 - 0.65 w zależności od kąta uchyłu (Tabela 5).</p>
                </div>
              </section>
            )}

            <div className="pt-6">
              <button type="submit" className="flex w-full items-center justify-center rounded-xl bg-primary px-9 py-4 text-base font-semibold text-white transition hover:bg-opacity-90">
                Weryfikuj Projekt
              </button>
            </div>
          </form>
        </div>

        {/* WYNIKI OBLICZEŃ */}
        {hasCalculated && results && (
          <div ref={resultsRef} className="mt-8 rounded-2xl bg-white p-8 shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800 animate-fade-in">
            <h2 className="mb-6 text-2xl font-semibold text-slate-950 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">Weryfikacja Projektu</h2>

            <div className="space-y-8">
              {/* ODDYMIANIE */}
              <div className="rounded-2xl border border-slate-100 p-5 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-dark dark:text-white">Urządzenia Oddymiające</h3>
                  {results.ventsPass ? (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Norma spełniona</span>
                  ) : (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Zbyt mała pow.</span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Zaprojektowana pow. czynna (A<sub>cz</sub>)</p>
                    <div className="mt-1">
                      <span className={`text-3xl font-bold ${results.ventsPass ? 'text-green-600' : 'text-red-600'}`}>
                        {results.actualAcz.toFixed(2)}
                      </span>
                      <span className="text-base ml-1">m²</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-500">Geometryczna: {results.actualGeomAcz.toFixed(2)} m²</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Minimum normowe</p>
                    <div className="mt-1">
                      <span className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {results.requiredAcz.toFixed(2)}
                      </span>
                      <span className="text-base ml-1">m²</span>
                    </div>
                    <p className="text-[10px] mt-1 text-gray-500">{results.minApplied ? `Rygor absolutnego minimum (${buildingType === 'wysokie' ? '1.5' : '1.0'} m²)` : `Wynika z reguły ${buildingType === 'wysokie' ? '7.5%' : '5%'} rzutu klatki.`}</p>
                  </div>
                </div>
              </div>

              {/* NAPOWIETRZANIE */}
              {results.compensationType === "MECHANICZNE" ? (
                <div className="rounded-2xl border border-amber-200 p-5 bg-amber-50 dark:bg-amber-900/20">
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">Powietrze Kompensacyjne (Mechaniczne)</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300">W budynkach wysokich normy dla grawitacyjnego napływu powietrza kompensacyjnego nie mają zastosowania. System wymaga zaprojektowania mechanicznego nawiewu zgodnie z zasadami wiedzy inżynierskiej.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 p-5 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-dark dark:text-white">Otwory Kompensacyjne</h3>
                    {results.compPass ? (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Norma spełniona</span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Zbyt mała pow.</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Zaprojektowana pow. efektywna (A<sub>eff</sub>)</p>
                      <div className="mt-1">
                        <span className={`text-3xl font-bold ${results.compPass ? 'text-green-600' : 'text-red-600'}`}>
                          {results.actualCompEffArea.toFixed(2)}
                        </span>
                        <span className="text-base ml-1">m²</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Minimum normowe</p>
                      <div className="mt-1">
                        <span className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                          {results.requiredCompEffArea.toFixed(2)}
                        </span>
                        <span className="text-base ml-1">m²</span>
                      </div>
                      <p className="text-[10px] mt-1 text-gray-500">Mnożnik z uwagi na układ otworów: {(results.compMultiplier * 100).toFixed(0)}% z min. A<sub>odd</sub>.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}