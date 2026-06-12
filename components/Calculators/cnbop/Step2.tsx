"use client";

import React from "react";
import {
  Step1Data, Step2Data, Step2aData, CFDConditions, CFDWarnings, ExtraCFD,
  toNum, toStr,
} from "@/lib/calculations/cnbop";
import Tooltip from "@/components/Calculators/ui/Tooltip";
import UnitInput from "@/components/Calculators/ui/UnitInput";
import {
  StairsIcon, PlatformIcon, HoleIcon, CoreIcon,
  AlertTriangleIcon, InfoCircleIcon, TrashIcon,
} from "@/components/Calculators/ui/Icons";

interface Step2Props {
  step1Data: Step1Data;
  step2Data: Step2Data;
  setStep2Data: React.Dispatch<React.SetStateAction<Step2Data>>;
  step2aData: Step2aData;
  setStep2aData: React.Dispatch<React.SetStateAction<Step2aData>>;
  cfDCond: CFDConditions;
  setCFDCond: React.Dispatch<React.SetStateAction<CFDConditions>>;
  minDims: { x: number; y: number };
  step2Errors: string[];
  validation: { valid: boolean };
  akso: number;
  abSum: number;
  cfnWarnings: CFDWarnings;
  extraCFD: ExtraCFD;
  anyCFD: boolean;
}

export default function Step2({
  step1Data, step2Data, setStep2Data, step2aData, setStep2aData,
  cfDCond, setCFDCond, minDims, step2Errors, validation,
  akso, abSum, cfnWarnings, extraCFD, anyCFD,
}: Step2Props) {

  const updateArrayData = (section: "flights" | "landings" | "openings" | "cores", id: number, field: string, val: string) => {
    setStep2aData(p => ({ ...p, [section]: p[section].map((item: any) => item.id === id ? { ...item, [field]: val } : item) }));
  };

  const addArrayItem = (section: "flights" | "landings" | "openings" | "cores") => {
    const newItem =
      section === "flights" ? { width: "", length: "" } :
      section === "landings" ? { width: "", depth: "" } :
      { area: "" };
    setStep2aData(p => ({ ...p, [section]: [...p[section], { id: Date.now(), ...newItem }] }));
  };

  const removeArrayItem = (section: "flights" | "landings" | "openings" | "cores", id: number) => {
    setStep2aData(p => ({ ...p, [section]: p[section].filter((item: any) => item.id !== id) }));
  };

  const cfdCheckboxes = [
    { key: "corrLength" as const, label: "Korytarz / przestrzeń połączona z klatką ma długość > 10 m" },
    { key: "doorDist" as const, label: "Odległość od jakichkolwiek drzwi do granicy A_KS przekracza 5 m" },
    { key: "corrWidth" as const, label: "Szerokość korytarza stanowiącego wspólną przestrzeń z klatką przekracza 3 m" },
  ];

  const isZLIVHigh = step1Data.categoryZL === "ZL_IV" && step1Data.buildingHeightGroup === "W";

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">

      {/* Physical AKS */}
      <div className="pl-5 border-l-2 border-primary/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <HoleIcon className="h-4 w-4 text-primary" />
              </span>
              Fizyczna powierzchnia klatki schodowej (A<sub>KS</sub>)
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-xl">
              Pole przekroju poziomego w obrysie ścian klatki, na rzucie architektonicznym. Używany wyłącznie do weryfikacji konieczności CFD z pkt 7.1.
            </p>
          </div>
          <div className="w-full md:w-64">
            <UnitInput
              unit="m²"
              value={step2Data.AKS}
              onChange={(val) => setStep2Data(p => ({ ...p, AKS: val }))}
              placeholder="np. 15,00"
            />
          </div>
        </div>
      </div>

      {/* AKS-O calculation */}
      <div>
        <div className="flex flex-col lg:flex-row lg:justify-between gap-6 mb-6 lg:mb-8 lg:items-center border-b border-slate-100 dark:border-slate-800 pb-6 lg:pb-8">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Powierzchnia obliczeniowa (A<sub>KS-O</sub>)
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1.5">
              Geometria biegów i spoczników do obliczeń wymiarów instalacji oddymiającej.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-slate-400">Tryb wprowadzania:</label>
            <select
              value={step2aData.calculationMode}
              onChange={(e) => setStep2aData({ ...step2aData, calculationMode: e.target.value as any })}
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-[#1E2342]"
            >
              <option value="auto">Z wymiarów elementów (Auto)</option>
              <option value="manual">Sumaryczna pow. (Manual)</option>
            </select>
          </div>
        </div>

        {step2aData.calculationMode === "auto" ? (
          <div className="space-y-8 md:space-y-10 animate-fade-in">
            {/* Flights (A) */}
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <StairsIcon className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">Biegi schodowe <span className="text-slate-400 font-normal">(A)</span></h3>
                    <p className="text-xs text-slate-400">Rzuty poziome biegów</p>
                  </div>
                </div>
                <button
                  onClick={() => addArrayItem("flights")}
                  className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 py-1.5 px-3 rounded-lg transition w-full sm:w-auto"
                >
                  + Dodaj bieg
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {step2aData.flights.map((f, idx) => (
                  <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-3.5">
                    <span className="text-sm font-medium text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                    <UnitInput
                      label={`Szer. (x) [min ${toStr(minDims.x)}m]`}
                      unit="m"
                      value={f.width}
                      onChange={(val) => updateArrayData("flights", f.id, "width", val)}
                      className={toNum(f.width) > 0 && toNum(f.width) < minDims.x ? "!border-red-400 focus:ring-red-100" : ""}
                    />
                    <UnitInput
                      label="Długość rzutu"
                      unit="m"
                      value={f.length}
                      onChange={(val) => updateArrayData("flights", f.id, "length", val)}
                    />
                    <button
                      onClick={() => removeArrayItem("flights", f.id)}
                      disabled={step2aData.flights.length === 1}
                      className="text-red-400 hover:text-red-600 p-2 sm:mt-6 self-end sm:self-auto transition-colors disabled:opacity-30"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Landings (B) */}
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <PlatformIcon className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">Spoczniki <span className="text-slate-400 font-normal">(B)</span></h3>
                    <p className="text-xs text-slate-400">Wymiarowe poziomy spocznikowe</p>
                  </div>
                </div>
                <button
                  onClick={() => addArrayItem("landings")}
                  className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 py-1.5 px-3 rounded-lg transition w-full sm:w-auto"
                >
                  + Dodaj spocznik
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {step2aData.landings.map((l, idx) => (
                  <div key={l.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-3.5">
                    <span className="text-sm font-medium text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                    <UnitInput
                      label={`Szer. (y) [min ${toStr(minDims.y)}m i y ≥ x]`}
                      unit="m"
                      value={l.width}
                      onChange={(val) => updateArrayData("landings", l.id, "width", val)}
                      className={toNum(l.width) > 0 && toNum(l.width) < minDims.y ? "!border-red-400 focus:ring-red-100" : ""}
                    />
                    <UnitInput
                      label="Głębokość z rzutu"
                      unit="m"
                      value={l.depth}
                      onChange={(val) => updateArrayData("landings", l.id, "depth", val)}
                    />
                    <button
                      onClick={() => removeArrayItem("landings", l.id)}
                      disabled={step2aData.landings.length === 1}
                      className="text-red-400 hover:text-red-600 p-2 sm:mt-6 self-end sm:self-auto transition-colors disabled:opacity-30"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Openings (C) and Cores (D) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="rounded-xl bg-white p-5 md:p-6 border border-slate-200 dark:bg-[#111827] dark:border-slate-800">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                      <HoleIcon className="h-3.5 w-3.5 text-slate-500" />
                    </span>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      Otwory zrzutowe (<Tooltip text="Otwory pionowe w stropach klatki (inne niż dusza).">C</Tooltip>)
                    </h4>
                  </div>
                  <button
                    onClick={() => addArrayItem("openings")}
                    className="text-xs font-bold bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg dark:bg-slate-800 dark:text-slate-300"
                  >
                    + Dodaj
                  </button>
                </div>
                <div className="space-y-3">
                  {step2aData.openings.map((o) => (
                    <div key={o.id} className="flex gap-3 items-center">
                      <UnitInput
                        unit="m²"
                        value={o.area}
                        onChange={(val) => updateArrayData("openings", o.id, "area", val)}
                        placeholder="0,00"
                        className="text-sm py-2 px-4"
                      />
                      <button onClick={() => removeArrayItem("openings", o.id)} className="text-red-400 hover:text-red-600 p-1.5 transition-colors">
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 md:p-6 border border-slate-200 dark:bg-[#111827] dark:border-slate-800">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                      <CoreIcon className="h-3.5 w-3.5 text-slate-500" />
                    </span>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      Dusza schodów (<Tooltip text="Centralny prześwit pionowy.">D</Tooltip>)
                    </h4>
                  </div>
                  <button
                    onClick={() => addArrayItem("cores")}
                    className="text-xs font-bold bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg dark:bg-slate-800 dark:text-slate-300"
                  >
                    + Dodaj
                  </button>
                </div>
                <div className="space-y-3">
                  {step2aData.cores.map((c) => (
                    <div key={c.id} className="flex gap-3 items-center">
                      <UnitInput
                        unit="m²"
                        value={c.area}
                        onChange={(val) => updateArrayData("cores", c.id, "area", val)}
                        placeholder="0,00"
                        className="text-sm py-2 px-4"
                      />
                      <button onClick={() => removeArrayItem("cores", c.id)} className="text-red-400 hover:text-red-600 p-1.5 transition-colors">
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Manual mode */
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div className="rounded-xl bg-blue-50/50 p-4 md:p-5 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1.5">
                <InfoCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  Wymogi § 68 WT dla tego obiektu: x = {toStr(minDims.x)}m, y = {toStr(minDims.y)}m
                </p>
              </div>
              <p className="text-xs text-blue-800/80 dark:text-blue-400 leading-relaxed">
                Upewnij się, że sumaryczne pola A i B bazują na minimalnych dopuszczalnych gabarytach rzutów.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <UnitInput label="Suma rzutów biegów (A)" unit="m²" required value={step2Data.A} onChange={(val) => setStep2Data(p => ({ ...p, A: val }))} />
              <UnitInput label="Suma wymiarowych spoczników (B)" unit="m²" required value={step2Data.B} onChange={(val) => setStep2Data(p => ({ ...p, B: val }))} />
              <UnitInput label="Dusza schodów (D)" unit="m²" value={step2Data.D} onChange={(val) => setStep2Data(p => ({ ...p, D: val }))} />
              <UnitInput label="Otwory przelotowe (C)" unit="m²" value={step2Data.C} onChange={(val) => setStep2Data(p => ({ ...p, C: val }))} />
            </div>
          </div>
        )}

        {/* CFD conditions */}
        <div className="mt-8 md:mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />
            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
              Warunki otoczenia — weryfikacja CFD (rozdz. 7.1)
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Zaznacz każdy warunek, który NIE jest spełniony — wymagana będzie symulacja CFD.
          </p>
          {isZLIVHigh && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 animate-fade-in">
              <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-red-800 dark:text-red-300 leading-snug">
                ZL IV wysoki (W): CFD wymagane bezwzględnie (pkt 7.1).
              </p>
            </div>
          )}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {cfdCheckboxes.map(({ key, label }) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition ${
                  cfDCond[key]
                    ? "bg-red-50 dark:bg-red-950/20"
                    : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={cfDCond[key]}
                  onChange={(e) => setCFDCond(p => ({ ...p, [key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-500 focus:ring-red-400 shrink-0"
                />
                <span className={`text-xs leading-snug mt-0.5 ${cfDCond[key] ? "text-red-800 dark:text-red-300 font-medium" : "text-slate-700 dark:text-slate-300"}`}>
                  {label}
                </span>
              </label>
            ))}
            {isZLIVHigh && (
              <label className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition ${cfDCond.highNoSeparation ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30"}`}>
                <input
                  type="checkbox"
                  checked={cfDCond.highNoSeparation}
                  onChange={(e) => setCFDCond(p => ({ ...p, highNoSeparation: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-500 focus:ring-red-400 shrink-0"
                />
                <span className={`text-xs leading-snug mt-0.5 ${cfDCond.highNoSeparation ? "text-red-800 dark:text-red-300 font-medium" : "text-slate-700 dark:text-slate-300"}`}>
                  ZL IV W: korytarze przyległe NIE są oddzielone drzwiami
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Validation errors */}
        {step2Errors.length > 0 && (
          <div className="rounded-xl bg-red-50 p-5 md:p-6 mt-8 border border-red-200 dark:bg-red-950/30 dark:border-red-800 text-red-900 dark:text-red-300 animate-fade-in">
            <p className="mb-3 font-bold flex items-center gap-2">Wymagana korekta danych (§ 68 WT / rozdz. 6.2 CNBOP):</p>
            <ul className="list-inside list-disc space-y-1.5 text-xs md:text-sm font-medium">
              {step2Errors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Summary */}
        {validation.valid && (
          <div className="mt-8 md:mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="border-l-2 border-green-400 dark:border-green-600 pl-4 py-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex flex-wrap items-baseline gap-1.5">
                <Tooltip text="AKS-O = A + B + C + D — suma biegów, spoczników, otworów i duszy. Podstawa do obliczenia Acz i strumieni.">A<sub>KS-O</sub></Tooltip>
                <span className="text-slate-400 font-normal">=</span>
                <span className="text-xl font-semibold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">{toStr(akso)} m²</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                A({toStr(toNum(step2Data.A))}) + B({toStr(toNum(step2Data.B))}) + C({toStr(toNum(step2Data.C))}) + D({toStr(toNum(step2Data.D))})
              </p>
            </div>
            {anyCFD && (
              <div className="rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4">
                <p className="mb-2.5 text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                  Konieczność CFD (pkt 7.1):
                </p>
                <ul className="space-y-1 text-xs text-red-600 dark:text-red-400">
                  {cfnWarnings.cfnC && <li>• Otwory przelotowe C &gt; 10% (A+B)</li>}
                  {cfnWarnings.cfnD && <li>• Dusza schodów D &gt; 25% (A+B)</li>}
                  {cfnWarnings.cfnAKS && <li>• A<sub>KS</sub> = {toStr(toNum(step2Data.AKS))} m² &gt; 40 m²</li>}
                  {extraCFD.zlIVHighAuto && <li>• ZL IV W — klatka pionowej ewakuacji</li>}
                  {extraCFD.corrLength && <li>• Korytarz połączony z klatką &gt; 10 m</li>}
                  {extraCFD.doorDist && <li>• Odległość drzwi od granicy A<sub>KS</sub> &gt; 5 m</li>}
                  {extraCFD.corrWidth && <li>• Szerokość korytarza &gt; 3 m</li>}
                  {extraCFD.highNoSeparation && <li>• ZL IV W: korytarze nieoddzielone drzwiami</li>}
                  {cfnWarnings.cfnSerialDoors && <li>• Napływ grawitacyjny przez 2 drzwi w szeregu &gt;5 m</li>}
                </ul>
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Wycena CFD:{" "}
                    <a href="mailto:biuro@fp-solutions.pl" className="font-medium hover:underline">biuro@fp-solutions.pl</a>
                    {" · "}
                    <a href="tel:+48790782993" className="font-medium hover:underline">+48 790 782 993</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

