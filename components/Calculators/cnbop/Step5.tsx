"use client";

import React, { useRef, useState } from "react";
import {
  Step1Data, Step2Data, Step4Data, CalculationResults, CFDWarnings, ExtraCFD,
  toNum, toStr,
} from "@/lib/calculations/cnbop";
import { AlertTriangleIcon, InfoCircleIcon } from "@/components/Calculators/ui/Icons";

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
  onCopyLink?: () => void;
}

export default function Step5({
  results, step1Data, step2Data, step4Data, akso, abSum,
  actualVent, compCalc, cfnWarnings, extraCFD, anyCFD,
  onDownloadPDF, onDownloadXLSX, onDownloadDOCX, onReset, onCopyLink,
}: Step5Props) {
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    onCopyLink?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div id="cnbop-results" className="space-y-8 animate-fade-in">

      {/* ── HEADER ROW ── */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-400 mb-1">Krok 4 z 4</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Wyniki obliczeń</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onCopyLink && (
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-600 dark:text-green-400">Skopiowano</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Udostępnij
                </>
              )}
            </button>
          )}
          <div ref={downloadMenuRef} className="relative">
          <button
            onClick={() => setDownloadMenuOpen(o => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Pobierz raport
            <svg className={`h-3 w-3 transition-transform ${downloadMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {downloadMenuOpen && (
            <div className="absolute top-full mt-2 right-0 w-56 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#111827] overflow-hidden z-50">
              {[
                { label: "PDF", sub: "Gotowy do druku", ext: ".pdf", onClick: () => { onDownloadPDF(); setDownloadMenuOpen(false); } },
                { label: "Excel", sub: "Dane do edycji", ext: ".xlsx", onClick: () => { onDownloadXLSX(); setDownloadMenuOpen(false); } },
                { label: "Word", sub: "Raport edytowalny", ext: ".docx", onClick: () => { onDownloadDOCX(); setDownloadMenuOpen(false); } },
              ].map(({ label, sub, ext, onClick }) => (
                <button
                  key={ext}
                  onClick={onClick}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
                    <span className="text-xs text-slate-400">{sub}</span>
                  </div>
                  <span className="text-xs text-slate-400">{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── INPUT SUMMARY ── */}
      <div>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-4">Dane wejściowe</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-6">
          <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
            <p className="text-[11px] text-slate-400 mb-2">Budynek</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-300">
              {categories.find(c => c.value === step1Data.categoryZL)?.label.split(" (")[0]}
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-400 mt-0.5">
              {heightGroupLabels[step1Data.buildingHeightGroup]}
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-400 mt-0.5">
              {step1Data.numberOfFloorsTotal} kond. ({step1Data.numberOfFloorsAbove}+{step1Data.numberOfFloorsBelow})
            </p>
          </div>
          <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
            <p className="text-[11px] text-slate-400 mb-2">Zabezpieczenia</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
              EI 30:{" "}
              <span className={step1Data.stairwellEnclosure === "ppoż" ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                {step1Data.stairwellEnclosure === "ppoż" ? "tak" : "nie"}
              </span>
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-400 mt-0.5">
              Samozamykacze:{" "}
              <span className={step1Data.selfClosers ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                {step1Data.selfClosers ? "tak" : "nie"}
              </span>
            </p>
          </div>
          <div className="border-l-2 border-primary/30 dark:border-primary/50 pl-4 sm:col-span-2">
            <p className="text-[11px] text-slate-400 mb-2">Powierzchnia klatki</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              A<sub>KS</sub> = <span className="font-semibold text-slate-800 dark:text-slate-200">{toStr(toNum(step2Data.AKS))} m²</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              A<sub>KS-O</sub> = <span className="font-semibold text-primary">{toStr(results.AKS_O)} m²</span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-slate-400 dark:text-slate-500">
              {(["A", "B", "C", "D"] as const).map((sym, i) => {
                const labels = ["biegi", "spoczniki", "otwory", "dusza"];
                const vals = [step2Data.A, step2Data.B, step2Data.C, step2Data.D];
                return (
                  <span key={sym}>
                    {sym} ({labels[i]}): <strong className="text-slate-600 dark:text-slate-400">{toStr(toNum(vals[i]))} m²</strong>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── SYSTEM TYPE ── */}
      <div className="flex items-center gap-3 py-4 border-t border-b border-slate-100 dark:border-slate-800">
        <span className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold shrink-0 ${
          isGrav
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-primary/10 text-primary"
        }`}>
          {isGrav ? "G" : "M"}
        </span>
        <div>
          <p className="text-[11px] text-slate-400">Zalecany typ systemu</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isGrav ? "Oddymianie grawitacyjne" : "System z nawiewem mechanicznym"}
          </p>
        </div>
      </div>

      {/* ── SMOKE VENT REQUIREMENTS ── */}
      <div>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-4">Wymagania — klapa dymowa</p>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Wymagane minimum<br /><span className="text-slate-400">(A<sub>cz,min</sub>)</span></p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {toStr(requiredAcz)}{" "}
                <span className="text-sm font-medium text-slate-400">m²</span>
              </p>
            </div>
            <div className={`p-5 ${ventOk ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Zadeklarowana klapa<br /><span className="text-slate-400">(A<sub>cz,rz.</sub>)</span></p>
              <p className={`text-2xl font-semibold tabular-nums ${ventOk ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {toStr(actualVent.Acz)}{" "}
                <span className="text-sm font-medium">m²</span>
              </p>
              <p className={`text-xs mt-1.5 font-medium ${ventOk ? "text-green-600 dark:text-green-500" : "text-red-500"}`}>
                {ventOk ? "✓ Spełnia wymogi" : "✗ Nie spełnia wymogów"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPENSATION (gravitational) ── */}
      {isGrav && (
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-4">Wymagania — napowietrzanie</p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {step4Data.compInputMethod === "calculate" ? (
              <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
                <div className="p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Wymagana pow. efektywna<br /><span className="text-slate-400">(A<sub>cz,komp,min</sub>)</span>
                  </p>
                  <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    {toStr(results.outputs.Akomp_eff || 0)}{" "}
                    <span className="text-sm font-medium text-slate-400">m²</span>
                  </p>
                </div>
                {(() => {
                  const req = results.outputs.Akomp_eff || 0;
                  const ok = compCalc.providedAeff >= req;
                  return (
                    <div className={`p-5 ${ok ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Dobrana pow. efektywna<br /><span className="text-slate-400">(A<sub>eff,komp</sub>)</span>
                      </p>
                      <p className={`text-2xl font-semibold tabular-nums ${ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {toStr(compCalc.providedAeff)}{" "}
                        <span className="text-sm font-medium">m²</span>
                      </p>
                      <p className={`text-xs mt-1.5 font-medium ${ok ? "text-green-600 dark:text-green-500" : "text-red-500"}`}>
                        {ok ? "✓ Otwory spełniają wymóg" : "✗ Otwory są za małe"}
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              (() => {
                const ok = compCalc.providedAcz >= actualVent.Acz;
                return (
                  <div className={`p-5 ${ok ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      A<sub>cz</sub> otworów kompensacyjnych vs. A<sub>cz</sub> klapy
                    </p>
                    <p className={`text-2xl font-semibold tabular-nums flex items-baseline gap-2 flex-wrap ${ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {toStr(compCalc.providedAcz)} <span className="text-sm">m²</span>
                      <span className="text-base text-slate-400 font-normal">vs</span>
                      {toStr(actualVent.Acz)} <span className="text-sm">m²</span>
                    </p>
                    <p className={`text-xs mt-1.5 font-medium ${ok ? "text-green-600 dark:text-green-500" : "text-red-500"}`}>
                      {ok ? "✓ Spełnia warunek" : "✗ Zbyt mała pow. czynna kompensacji"}
                    </p>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* ── FAN PERFORMANCE (mechanical) ── */}
      {!isGrav && (
        <div className="space-y-5">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Parametry wentylatora</p>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-5 py-3 text-slate-500">1. Strumień bazowy 0,2 m/s (V<sub>n_min</sub>)</td>
                  <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 text-right whitespace-nowrap">{results.outputs.vn_min} m³/h</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 text-slate-500">2. Strumień ucieczki nieszczelnościami przy 15 Pa (V<sub>n_p</sub>)</td>
                  <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 text-right whitespace-nowrap">{results.outputs.vn_p} m³/h</td>
                </tr>
                <tr className="bg-primary/5 dark:bg-primary/10">
                  <td className="px-5 py-3 font-medium text-primary">→ Kryterium I (V<sub>n1</sub>)</td>
                  <td className="px-5 py-3 font-semibold text-primary text-right whitespace-nowrap">{results.outputs.vn1} m³/h</td>
                </tr>
                {results.outputs.vn_v !== undefined && (
                  <>
                    <tr>
                      <td className="px-5 py-3 text-slate-500">3. Strumień ucieczki przez otwarte drzwi (V<sub>n_v</sub>)</td>
                      <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 text-right whitespace-nowrap">{results.outputs.vn_v} m³/h</td>
                    </tr>
                    <tr className="bg-primary/5 dark:bg-primary/10">
                      <td className="px-5 py-3 font-medium text-primary">→ Kryterium II (V<sub>n2</sub>)</td>
                      <td className="px-5 py-3 font-semibold text-primary text-right whitespace-nowrap">{results.outputs.vn2} m³/h</td>
                    </tr>
                  </>
                )}
                <tr className="bg-slate-800 dark:bg-slate-700">
                  <td className="px-5 py-3.5 font-medium text-slate-200">Strumień nawiewu (V<sub>n,max</sub>)</td>
                  <td className="px-5 py-3.5 font-bold text-white text-right whitespace-nowrap text-base">{results.outputs.vn_max} m³/h</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/20 p-6">
            <div className="grid grid-cols-2 gap-6 divide-x divide-green-200 dark:divide-green-800/50">
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
                  Wydajność wentylatora (V<sub>went</sub>)
                </p>
                <p className="text-2xl font-semibold text-green-700 dark:text-green-300 tabular-nums">
                  {results.outputs.v_went}{" "}
                  <span className="text-sm font-medium">m³/h</span>
                </p>
              </div>
              <div className="pl-6">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Spręż dyspozycyjny</p>
                <p className="text-2xl font-semibold text-green-700 dark:text-green-300 tabular-nums">
                  {results.outputs.totalPressure}{" "}
                  <span className="text-sm font-medium">Pa</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
              <InfoCircleIcon className="h-3.5 w-3.5 text-primary shrink-0" />
              Wytyczne lokalizacji punktów nawiewnych (rozdz. 6.4 CNBOP)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="space-y-1.5">
                <p className="font-medium text-slate-500">Prędkość nawiewu</p>
                <p>• Prędkość z kratki nawiewnej <strong>≤ 8 m/s</strong></p>
                <p>• Strumień nie może być skierowany bezpośrednio na drzwi (min. <strong>4 m</strong> odstępu)</p>
              </div>
              <div className="space-y-1.5">
                <p className="font-medium text-slate-500">Lokalizacja</p>
                <p>• <strong>1-punkt:</strong> poniżej stropu nad 1. kond. nadziemną</p>
                <p>• <strong>Rozproszony:</strong> ≥50% poniżej stropu 1. kond., reszta pod stropem 2. kond.</p>
                <p>• <strong>Wysoki:</strong> można podzielić na 3 kondygnacje (40% / 1., reszta na 2. i 3.)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CFD OPTIMIZATION (mechanical) ── */}
      {!isGrav && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
            <InfoCircleIcon className="h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Optymalizacja wg rozdz. 7.2 — Symulacja CFD</p>
              <p className="text-xs text-slate-400">Możliwe obniżenie wymaganej wydajności wentylatora</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Wytyczne CNBOP-PIB W-0003:2016 (rozdz. 7.2) dopuszczają weryfikację symulacją CFD.
              W praktyce pozwala to na{" "}
              <strong className="text-slate-800 dark:text-slate-200">obniżenie wymaganej wydajności wentylatora nawet o 50–60%</strong>.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-slate-50 dark:bg-[#1C213E] border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-400 mb-1">Wg obliczeń</p>
                <p className="text-base font-semibold text-slate-800 dark:text-white">{results.outputs.v_went} m³/h</p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/50 p-3">
                <p className="text-xs text-slate-400 mb-1">Po CFD (est.)</p>
                <p className="text-base font-semibold text-blue-700 dark:text-blue-400">~{Math.round((results.outputs.v_went || 0) * 0.50)} m³/h</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-800/50 p-3">
                <p className="text-xs text-slate-400 mb-1">Redukcja</p>
                <p className="text-base font-semibold text-green-600 dark:text-green-400">50–60%</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Zapytaj o wycenę:{" "}
              <a href="mailto:biuro@fp-solutions.pl" className="text-primary hover:underline">biuro@fp-solutions.pl</a>
              {" · "}
              <a href="tel:+48790782993" className="text-primary hover:underline">+48 790 782 993</a>
            </p>
          </div>
        </div>
      )}

      {/* ── CFD WARNING ── */}
      {anyCFD && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800/40 flex items-center gap-2.5">
            <AlertTriangleIcon className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-400">Konieczna weryfikacja CFD</p>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              Warunki stosowania metody obliczeniowej nie są w pełni spełnione (rozdz. 7.1):
            </p>
            <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              {cfnWarnings.cfnC && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Otwory przelotowe C = {toStr(toNum(step2Data.C))} m² &gt; 10% (A+B = {toStr(abSum)} m²)</li>}
              {cfnWarnings.cfnD && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Dusza schodów D = {toStr(toNum(step2Data.D))} m² &gt; 25% (A+B = {toStr(abSum)} m²)</li>}
              {cfnWarnings.cfnAKS && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Rzeczywista powierzchnia A<sub>KS</sub> = {toStr(toNum(step2Data.AKS))} m² przekracza 40 m² na kondygnacji</li>}
              {extraCFD.zlIVHighAuto && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Budynek ZL IV wysoki (W) — klatka stanowi pionową drogę ewakuacji (warunek bezwzględny)</li>}
              {extraCFD.corrLength && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Korytarz połączony z klatką ma długość &gt; 10 m</li>}
              {extraCFD.doorDist && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Odległość od najdalszych drzwi do granicy A<sub>KS-O</sub> przekracza 5 m</li>}
              {extraCFD.corrWidth && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Szerokość korytarza stanowiącego wspólną przestrzeń z klatką przekracza 3 m</li>}
              {cfnWarnings.cfnSerialDoors && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Napływ grawitacyjny przez dwoje drzwi w szeregu oddalonych o &gt; 5 m</li>}
              {extraCFD.highNoSeparation && <li className="flex gap-2"><span className="text-red-400 shrink-0">•</span>Budynek ZL IV W: występują korytarze przyległe nieoddzielone drzwiami</li>}
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Zapytaj o wycenę CFD:{" "}
              <a href="mailto:biuro@fp-solutions.pl" className="text-primary hover:underline">biuro@fp-solutions.pl</a>
              {" · "}
              <a href="tel:+48790782993" className="text-primary hover:underline">+48 790 782 993</a>
            </p>
          </div>
        </div>
      )}

      {/* ── RESET ── */}
      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-3"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Nowe obliczenie
        </button>
      </div>

    </div>

  </div>
  );
}
