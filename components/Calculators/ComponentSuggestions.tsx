"use client";

import { useState } from "react";
import { VentilatorComponent, DamperComponent } from "@/lib/calculations/mechanicalComponents";

interface ComponentSuggestionsProps {
  ventilators?: VentilatorComponent[];
  dampers?: DamperComponent[];
  volumeRequired?: number;
  pressureRequired?: number;
  areaRequired?: number;
}

export default function ComponentSuggestions({
  ventilators = [],
  dampers = [],
  volumeRequired,
  pressureRequired,
  areaRequired = 0,
}: ComponentSuggestionsProps) {
  const hasVentilators = ventilators.length > 0;
  const hasDampers = dampers.length > 0;

  const [damperConfig, setDamperConfig] = useState<Record<string, { deflectors: boolean, baffles: boolean }>>({});

  if (!hasVentilators && !hasDampers) return null;

  const handleDamperToggle = (id: string, field: "deflectors" | "baffles", value: boolean) => {
    setDamperConfig(prev => {
      const current = prev[id] || { deflectors: false, baffles: false };
      const next = { ...current, [field]: value };
      
      if (field === "baffles" && value) next.deflectors = true;
      if (field === "deflectors" && !value) next.baffles = false;
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="rounded-md border-2 border-blue-200 bg-blue-50 p-6 dark:bg-[#1E2342] dark:border-blue-800">
      <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
        <span className="mr-2 text-2xl">📦</span> Rekomendowane Urządzenia
      </h3>
      <p className="text-sm text-blue-800 dark:text-blue-300 mb-8 border-b border-blue-200 dark:border-blue-800 pb-4">
        Zestawienie dopasowanych urządzeń rynkowych. Dane pochodzą z norm PN-EN 12101-2 i DTR producentów.
      </p>

      {/* WENTYLATORY */}
      {hasVentilators && (
        <div className="mb-10">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-4 uppercase tracking-wider text-sm flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            Nawiew Mechaniczny
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ventilators.map((v, idx) => (
              <div key={v.id} className="flex flex-col relative rounded-lg p-5 border border-gray-200 bg-white dark:bg-[#242B51] dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {v.manufacturer}
                </div>
                <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                  {v.model}
                </h5>
                <span className="inline-block self-start px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px] rounded mb-4 font-medium uppercase">
                  {v.installationType === "wall" ? "Montaż Ścienny" : v.installationType === "ducted" ? "Montaż Kanałowy" : "Dachowy"}
                </span>

                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                    <span className="text-gray-500">Wydajność max:</span>
                    <span className="font-semibold">{v.volumeRange[1]} m³/h</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                    <span className="text-gray-500">Spręż max:</span>
                    <span className="font-semibold">{v.pressureRange[1]} Pa</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between">
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-semibold transition">
                      Karta produktu ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KLAPY */}
      {hasDampers && (
        <div>
          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-4 uppercase tracking-wider text-sm flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
            Urządzenia Oddymiające
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {dampers.map((d) => {
              const config = damperConfig[d.id] || { deflectors: false, baffles: false };
              let currentCv = d.cvValues.base;
              if (config.baffles) currentCv = d.cvValues.full;
              else if (config.deflectors) currentCv = d.cvValues.withDeflectors;

              const validVariants = d.variants.filter(v => (v.aGeom * currentCv) >= areaRequired);

              return (
                <div key={d.id} className="relative flex flex-col rounded-lg p-5 border border-gray-200 bg-white dark:bg-[#242B51] dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {d.manufacturer}
                      </div>
                      <h5 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                        {d.model}
                      </h5>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{d.type}</div>
                    </div>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline border border-blue-200 dark:border-blue-800 rounded px-2 py-1">
                        Oferta ↗
                      </a>
                    )}
                  </div>

                  <div className="my-4 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold mb-2">Konfiguracja osprzętu aerodynamicznego:</p>
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" disabled={!d.accessoriesOptions.canHaveDeflectors} checked={config.deflectors} onChange={(e) => handleDamperToggle(d.id, "deflectors", e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
                        <span className={!d.accessoriesOptions.canHaveDeflectors ? "opacity-50" : ""}>Owiewki wiatrowe</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" disabled={!d.accessoriesOptions.canHaveBaffles} checked={config.baffles} onChange={(e) => handleDamperToggle(d.id, "baffles", e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
                        <span className={!d.accessoriesOptions.canHaveBaffles ? "opacity-50" : ""}>Kierownica strumienia (wymusza owiewki)</span>
                      </label>
                    </div>
                    <div className="mt-3 text-xs flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="text-gray-500">Obecny współczynnik C<sub>v</sub>:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{currentCv.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Odpowiednie wymiary (min. {areaRequired.toFixed(2)} m² czynnej):
                    </p>
                    {validVariants.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {validVariants.map((v, i) => (
                          <div key={i} className="bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 text-center">
                            <span className="block text-xs font-bold text-amber-900 dark:text-amber-100">{v.dimensions}</span>
                            <span className="block text-[10px] text-amber-700 dark:text-amber-300">
                              A<sub>cz</sub>: {(v.aGeom * currentCv).toFixed(2)} m²
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-red-50 text-red-700 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300 p-2 rounded text-xs">
                        Brak gabarytu pokrywającego wymóg z 1 sztuki. Dodaj osprzęt aerodynamiczny z góry lub zaplanuj wielokrotność małych klap.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}