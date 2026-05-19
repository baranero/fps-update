"use client";

import React, { useRef, useState } from "react";
import {
  Step1Data, Step2Data, Step4Data, CalculationResults, CFDWarnings, ExtraCFD,
  toNum, toStr,
} from "@/lib/calculations/cnbop";
import { AlertTriangleIcon, InfoCircleIcon } from "@/components/Calculators/ui/Icons";
import Tooltip from "@/components/Calculators/ui/Tooltip";

const categories = [
  { value: "ZL_I", label: "ZL I (Użyteczność publ. >50 os.)" },
  { value: "ZL_II", label: "ZL II (Zdrowie, Przedszkola)" },
  { value: "ZL_III", label: "ZL III (Inne użyteczności publ.)" },
  { value: "ZL_IV", label: "ZL IV (Mieszkalne)" },
  { value: "ZL_V", label: "ZL V (Zamieszkania zbiorowego)" },
  { value: "PM", label: "PM (Produkcyjno-Magazynowe)" },
];

interface Step5Props {
  results: CalculationResults;
  step1Data: Step1Data;
  step2Data: Step2Data;
  step4Data: Step4Data;
  akso: number;
  abSum: number;
  actualVent: { Acz: number; Ageom: number };
  compCalc: { providedAcz: number; providedAgeom: number; providedAeff: number };
  cfnWarnings: CFDWarnings;
  extraCFD: ExtraCFD;
  anyCFD: boolean;
  onDownloadPDF: () => void;
  onDownloadXLSX: () => void;
  onDownloadDOCX: () => void;
  onReset: () => void;
}

export default function Step5({
  results, step1Data, step2Data, step4Data, akso, abSum,
  actualVent, compCalc, cfnWarnings, extraCFD, anyCFD,
  onDownloadPDF, onDownloadXLSX, onDownloadDOCX, onReset,
}: Step5Props) {
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  React.useEffect(() => {
    if (!downloadMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [downloadMenuOpen]);

  const heightGroupLabels: Record<string, string> = {
    N: "N — niski", SW: "SW — średniowysoki", W: "W — wysoki", WW: "WW — wysokościowy",
  };

  const isGrav = results.systemType === "GRAVITATIONAL";
  const requiredAcz = results.outputs.Acz || 0;
  const ventOk = actualVent.Acz >= requiredAcz;

  return (
    <div className="space-y-10 animate-fade-in">
      <div id="cnbop-results" className="rounded-2xl bg-white p-6 md:p-10 shadow-md border border-slate-100 dark:bg-[#111827] dark:border-slate-800">
        <h2 className="mb-8 md:mb-10 text-xl md:text-2xl font-bold text-slate-950 dark:text-white tracking-tight border-b border-slate-100 dark:border-slate-800 pb-6 md:pb-8">
          Zestawienie Końcowe
        </h2>

        {/* Input summary */}
        <div className="mb-10 md:mb-12 rounded-2xl bg-slate-50 dark:bg-[#1C213E] p-6 md:p-8 border border-slate-100 dark:border-slate-800">
          <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3">
            Podsumowanie wprowadzonych założeń
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
            <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Budynek</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-2.5">
                Kategoria <strong className="text-primary">{categories.find(c => c.value === step1Data.categoryZL)?.label.split(" (")[0]}</strong>
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-1">
                Klasa wys. <strong className="text-primary">{heightGroupLabels[step1Data.buildingHeightGroup]}</strong>
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-1">
                <strong className="text-primary">{step1Data.numberOfFloorsTotal}</strong> kond.{" "}
                ({step1Data.numberOfFloorsAbove} nadz. + {step1Data.numberOfFloorsBelow} podz.)
              </p>
            </div>
            <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Zabezpieczenia</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-2.5">
                Obudowa EI 30:{" "}
                <strong className={step1Data.stairwellEnclosure === "ppoż" ? "text-green-600" : "text-red-500"}>
                  {step1Data.stairwellEnclosure === "ppoż" ? "Tak" : "Nie"}
                </strong>
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-1">
                Samozamykacze:{" "}
                <strong className={step1Data.selfClosers ? "text-green-600" : "text-red-500"}>
                  {step1Data.selfClosers ? "Tak" : "Nie"}
                </strong>
              </p>
            </div>
            <div className="border-l-2 border-primary/30 dark:border-primary/50 pl-4 sm:col-span-2 lg:col-span-2">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-primary/80">Powierzchnia obliczeniowa klatki</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-2.5">
                A<sub>KS</sub> = <strong className="text-primary whitespace-nowrap">{toStr(toNum(step2Data.AKS))} m²</strong>
              </p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                A<sub>KS-O</sub> = <strong className="text-primary whitespace-nowrap">{toStr(results.AKS_O)} m²</strong>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {(["A", "B", "C", "D"] as const).map((sym, i) => {
                  const labels = ["biegi", "spoczniki", "otwory", "dusza"];
                  const vals = [step2Data.A, step2Data.B, step2Data.C, step2Data.D];
                  return (
                    <div key={sym} className="flex flex-col">
                      <span className="font-bold text-slate-400">{sym}</span>
                      <span>{labels[i]}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{toStr(toNum(vals[i]))} m²</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* System type */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Zalecane rozwiązanie wykonawcze (wg CNBOP)
        </p>
        <p className="text-xl md:text-2xl font-bold text-primary dark:text-white uppercase tracking-tight mb-8">
          {isGrav ? "Oddymianie Grawitacyjne" : "System z Nawiewem Mechanicznym"}
        </p>

        {/* Smoke vent requirements */}
        <h3 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
          Wymagania dla klapy dymowej
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:bg-[#1C213E] dark:border-slate-800 flex flex-col justify-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Wymagane minimum (A<sub>cz, min</sub>)</p>
            <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight whitespace-nowrap">
              {toStr(requiredAcz)} <span className="text-base font-bold">m²</span>
            </p>
          </div>
          <div className={`rounded-2xl border p-6 flex flex-col justify-center ${ventOk ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700" : "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700"}`}>
            <p className="text-sm font-semibold mb-2">Zadeklarowana klapa (A<sub>cz, rz.</sub>)</p>
            <p className={`text-xl md:text-2xl font-black tracking-tight whitespace-nowrap ${ventOk ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
              {toStr(actualVent.Acz)} <span className="text-base font-bold">m²</span>
            </p>
            <p className={`text-xs mt-1 font-bold ${ventOk ? "text-green-600" : "text-red-600"}`}>
              {ventOk ? "✓ Spełnia wymogi" : "✗ Nie spełnia wymogów"}
            </p>
          </div>
        </div>

        {/* Gravitational: compensation results */}
        {isGrav && (
          <>
            <h3 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
              Wymagania dla napowietrzania
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 mb-10">
              {step4Data.compInputMethod === "calculate" ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:bg-[#1C213E] dark:border-slate-800 flex flex-col justify-center">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Wymagana pow. efektywna (A<sub>cz,komp,min</sub>)
                    </p>
                    <p className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight whitespace-nowrap">
                      {toStr(results.outputs.Akomp_eff || 0)}{" "}
                      <span className="text-base font-bold">m²</span>
                    </p>
                  </div>
                  {(() => {
                    const req = results.outputs.Akomp_eff || 0;
                    const ok = compCalc.providedAeff >= req;
                    return (
                      <div className={`rounded-2xl border p-6 flex flex-col justify-center ${ok ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700" : "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700"}`}>
                        <p className="text-sm font-semibold mb-2">
                          Dobrana pow. efektywna (A<sub>eff,komp</sub>)
                        </p>
                        <p className={`text-xl md:text-2xl font-black tracking-tight whitespace-nowrap ${ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                          {toStr(compCalc.providedAeff)} <span className="text-base font-bold">m²</span>
                        </p>
                        <p className={`text-xs mt-1 font-bold ${ok ? "text-green-600" : "text-red-600"}`}>
                          {ok ? "✓ Otwory spełniają wymóg" : "✗ Otwory są za małe"}
                        </p>
                      </div>
                    );
                  })()}
                </>
              ) : (
                (() => {
                  const ok = compCalc.providedAcz >= actualVent.Acz;
                  return (
                    <div className={`rounded-2xl border p-6 flex flex-col justify-center sm:col-span-2 ${ok ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700" : "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700"}`}>
                      <p className="text-sm font-semibold mb-2">
                        A<sub>cz</sub> otworów kompensacyjnych względem klapy (A<sub>cz,komp</sub> ≥ A<sub>cz,klapy</sub>)
                      </p>
                      <p className={`text-xl md:text-2xl font-black tracking-tight whitespace-nowrap ${ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                        {toStr(compCalc.providedAcz)} <span className="text-base font-bold text-slate-500">vs</span>{" "}
                        {toStr(actualVent.Acz)} <span className="text-base font-bold">m²</span>
                      </p>
                      <p className={`text-xs mt-1 font-bold ${ok ? "text-green-600" : "text-red-600"}`}>
                        {ok ? "✓ Spełnia warunek" : "✗ Zbyt mała pow. czynna kompensacji"}
                      </p>
                    </div>
                  );
                })()
              )}
            </div>
          </>
        )}

        {/* Mechanical: fan performance */}
        {!isGrav && (
          <div className="space-y-6 md:space-y-8">
            <h3 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Karta Osiągów: Strumienie i Wentylator
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm dark:bg-[#111827] dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[500px]">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 text-slate-500 font-medium">1. Strumień bazowy 0,2 m/s (V<sub>n_min</sub>)</td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">{results.outputs.vn_min} m³/h</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-500 font-medium">2. Strumień ucieczki nieszczelnościami przy 15 Pa (V<sub>n_p</sub>)</td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">{results.outputs.vn_p} m³/h</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-[#1C213E]">
                    <td className="py-4 px-3 font-bold text-primary rounded-l-lg">→ Kryterium I (V<sub>n1</sub>)</td>
                    <td className="py-4 px-3 font-black text-primary text-right rounded-r-lg whitespace-nowrap text-base">{results.outputs.vn1} m³/h</td>
                  </tr>
                  {results.outputs.vn_v !== undefined && (
                    <>
                      <tr>
                        <td className="py-3 pt-5 text-slate-500 font-medium">3. Strumień ucieczki przez otwarte drzwi (V<sub>n_v</sub>)</td>
                        <td className="py-3 pt-5 font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">{results.outputs.vn_v} m³/h</td>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-[#1C213E]">
                        <td className="py-4 px-3 font-bold text-primary rounded-l-lg">→ Kryterium II (V<sub>n2</sub>)</td>
                        <td className="py-4 px-3 font-black text-primary text-right rounded-r-lg whitespace-nowrap text-base">{results.outputs.vn2} m³/h</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:bg-[#1C213E] dark:border-slate-800 flex flex-col justify-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Obliczeniowy strumień powietrza nawiewanego (V<sub>n_max</sub>)
                </p>
                <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight whitespace-nowrap">
                  {results.outputs.vn_max} <span className="text-base font-bold">m³/h</span>
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 md:p-10 shadow-sm dark:from-green-950/40 dark:to-emerald-950/20 dark:border-green-800/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="border-b md:border-b-0 md:border-r border-green-200 dark:border-green-800/50 pb-6 md:pb-0 md:pr-8">
                  <p className="text-sm font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-3">Wydajność wentylatora (V<sub>went</sub>)</p>
                  <p className="text-3xl md:text-4xl font-black text-green-600 dark:text-green-400 tracking-tighter flex items-baseline flex-wrap gap-1.5">
                    {results.outputs.v_went}
                    <span className="text-xl md:text-2xl font-bold">m³/h</span>
                  </p>
                </div>
                <div className="md:pl-4">
                  <p className="text-sm font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-3">Spręż dyspozycyjny</p>
                  <p className="text-3xl md:text-4xl font-black text-green-600 dark:text-green-400 tracking-tighter flex items-baseline flex-wrap gap-1.5">
                    {results.outputs.totalPressure}
                    <span className="text-xl md:text-2xl font-bold">Pa</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-[#1C213E] dark:border-slate-800 p-5 md:p-6">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <InfoCircleIcon className="h-4 w-4 text-primary shrink-0" />
                Wytyczne lokalizacji punktów nawiewnych (rozdz. 6.4 CNBOP)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="space-y-2">
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-2">Prędkość nawiewu</p>
                  <p>• Prędkość z kratki nawiewnej <strong>≤ 8 m/s</strong></p>
                  <p>• Strumień nie może być skierowany bezpośrednio na drzwi (min. <strong>4 m</strong> odstępu)</p>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-2">Lokalizacja</p>
                  <p>• <strong>1-punktowy:</strong> poniżej stropu nad 1. kond. nadziemną</p>
                  <p>• <strong>Rozproszony:</strong> ≥50% poniżej stropu 1. kond., reszta pod stropem 2. kond.</p>
                  <p>• <strong>Wysoki:</strong> można podzielić na 3 kondygnacje (40% / 1., reszta na 2. i 3.)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CFD optimization proposal for mechanical systems */}
      {!isGrav && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 md:p-8 shadow-sm dark:bg-blue-950/20 dark:border-blue-800/50">
          <div className="flex items-start gap-4 mb-5">
            <span className="flex items-center justify-center rounded-xl bg-blue-100 text-blue-600 p-3 shrink-0 dark:bg-blue-900/50 dark:text-blue-400">
              <InfoCircleIcon className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-base md:text-lg font-black text-blue-800 dark:text-blue-300 uppercase tracking-tight">
                Optymalizacja wg rozdz. 7.2 — Symulacja CFD
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                Możliwe obniżenie wymaganej wydajności wentylatora
              </p>
            </div>
          </div>
          <p className="text-sm text-blue-900/80 dark:text-blue-300/90 leading-relaxed mb-5 max-w-4xl">
            Wytyczne CNBOP-PIB W-0003:2016 (rozdz. 7.2) dopuszczają weryfikację skuteczności systemu symulacją CFD,
            która uwzględnia rzeczywistą geometrię klatki schodowej. W praktyce pozwala to na{" "}
            <strong>obniżenie wymaganej wydajności wentylatora nawet o 50–60%</strong> w stosunku do wartości
            obliczeniowych, co bezpośrednio przekłada się na dobór wentylatora o znacznie mniejszej mocy
            i niższych kosztach eksploatacji.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-500 font-semibold mb-1">Wydajność wg obliczeń</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{results.outputs.v_went} m³/h</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-500 font-semibold mb-1">Potencjalnie po CFD (–50%)</p>
              <p className="text-lg font-black text-blue-700 dark:text-blue-400">
                ~{Math.round((results.outputs.v_went || 0) * 0.50)} m³/h
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-500 font-semibold mb-1">Orientacyjna redukcja</p>
              <p className="text-lg font-black text-green-600 dark:text-green-400">50–60%</p>
              <p className="text-xs text-slate-400">wydajności wentylatora</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-3">
              Skontaktuj się w sprawie wyceny symulacji CFD dla tego projektu:
            </p>
            <div className="flex flex-col gap-1 text-sm text-amber-800 dark:text-amber-300">
              <span><span className="font-medium">e-mail:</span>{" "}<a href="mailto:biuro@fp-solutions.pl" className="font-bold text-amber-700 dark:text-amber-400 underline hover:no-underline">biuro@fp-solutions.pl</a></span>
              <span><span className="font-medium">tel.:</span>{" "}<a href="tel:+48790782993" className="font-bold text-amber-700 dark:text-amber-400 underline hover:no-underline">+48 790 782 993</a></span>
            </div>
          </div>
        </div>
      )}

      {/* CFD warning */}
      {anyCFD && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 md:p-8 shadow-sm dark:bg-red-950/20 dark:border-red-800/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5 pb-5 border-b border-red-200 dark:border-red-800/50">
            <span className="flex items-center justify-center rounded-xl bg-red-100 text-red-600 p-3 shrink-0">
              <AlertTriangleIcon className="w-6 h-6" />
            </span>
            <h3 className="text-base md:text-lg font-black text-red-800 dark:text-red-400 uppercase tracking-tight">Konieczna weryfikacja CFD</h3>
          </div>
          <p className="mb-5 text-sm font-medium text-red-900/80 dark:text-red-300/90 leading-relaxed max-w-4xl">
            Warunki stosowania metody obliczeniowej nie są w pełni spełnione. Skuteczność systemu należy potwierdzić symulacją CFD z uwagi na poniższe punkty (rozdz. 7.1 wytycznych):
          </p>
          <ul className="space-y-2 text-sm text-red-800 dark:text-red-400 font-bold bg-white/50 dark:bg-black/20 p-4 rounded-xl">
            {cfnWarnings.cfnC && <li>• Otwory przelotowe C = {toStr(toNum(step2Data.C))} m² &gt; 10% (A+B = {toStr(abSum)} m²).</li>}
            {cfnWarnings.cfnD && <li>• Dusza schodów D = {toStr(toNum(step2Data.D))} m² &gt; 25% (A+B = {toStr(abSum)} m²).</li>}
            {cfnWarnings.cfnAKS && <li>• Rzeczywista powierzchnia A<sub>KS</sub> = {toStr(toNum(step2Data.AKS))} m² przekracza 40 m² na kondygnacji.</li>}
            {extraCFD.zlIVHighAuto && <li>• Budynek ZL IV wysoki (W) — klatka stanowi pionową drogę ewakuacji (warunek bezwzględny).</li>}
            {extraCFD.corrLength && <li>• Korytarz połączony z klatką ma długość &gt; 10 m.</li>}
            {extraCFD.doorDist && <li>• Odległość od najdalszych drzwi do granicy A<sub>KS-O</sub> przekracza 5 m.</li>}
            {extraCFD.corrWidth && <li>• Szerokość korytarza stanowiącego wspólną przestrzeń z klatką przekracza 3 m.</li>}
            {cfnWarnings.cfnSerialDoors && <li>• Napływ grawitacyjny przez dwoje drzwi w szeregu oddalonych o &gt; 5 m.</li>}
            {extraCFD.highNoSeparation && <li>• Budynek ZL IV W: występują korytarze przyległe nieoddzielone drzwiami.</li>}
          </ul>
          <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-3">
              Potrzebujesz weryfikacji CFD dla tego projektu? Skontaktuj się w celu wyceny:
            </p>
            <div className="flex flex-col gap-1 text-sm text-amber-800 dark:text-amber-300">
              <span><span className="font-medium">e-mail:</span>{" "}<a href="mailto:biuro@fp-solutions.pl" className="font-bold text-amber-700 dark:text-amber-400 underline hover:no-underline">biuro@fp-solutions.pl</a></span>
              <span><span className="font-medium">tel.:</span>{" "}<a href="tel:+48790782993" className="font-bold text-amber-700 dark:text-amber-400 underline hover:no-underline">+48 790 782 993</a></span>
            </div>
          </div>
        </div>
      )}

      {/* Download & reset buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-end">
        <div ref={downloadMenuRef} className="relative w-full sm:w-auto">
          <button
            onClick={() => setDownloadMenuOpen(o => !o)}
            className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 gap-2.5 shadow-md"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Pobierz raport</span>
            <svg className={`w-4 h-4 shrink-0 transition-transform duration-200 ${downloadMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {downloadMenuOpen && (
            <div className="absolute bottom-full mb-3 right-0 w-64 rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Wybierz format</p>
              </div>
              {[
                { label: "Raport PDF", sub: "Gotowy do druku i archiwizacji", ext: ".pdf", color: "red", onClick: () => { onDownloadPDF(); setDownloadMenuOpen(false); } },
                { label: "Arkusz Excel", sub: "Dane do dalszej edycji", ext: ".xlsx", color: "green", onClick: () => { onDownloadXLSX(); setDownloadMenuOpen(false); } },
                { label: "Dokument Word", sub: "Edytowalny raport tekstowy", ext: ".docx", color: "blue", onClick: () => { onDownloadDOCX(); setDownloadMenuOpen(false); } },
              ].map(({ label, sub, ext, color, onClick }) => (
                <React.Fragment key={ext}>
                  <button
                    onClick={onClick}
                    className={`group flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-${color}-100 text-${color}-600 group-hover:bg-${color}-600 group-hover:text-white transition-colors dark:bg-${color}-900/30 dark:text-${color}-400`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span>
                    </span>
                    <span className={`ml-auto text-[10px] font-bold text-${color}-600 dark:text-${color}-400 bg-${color}-50 dark:bg-${color}-900/20 px-1.5 py-0.5 rounded`}>{ext}</span>
                  </button>
                  <div className="mx-4 border-t border-slate-100 dark:border-slate-800 last:hidden" />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onReset}
          className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-slate-800 text-white px-5 py-3.5 text-sm font-bold transition hover:bg-slate-900 shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          Nowe Obliczenie
        </button>
      </div>
    </div>
  );
}

