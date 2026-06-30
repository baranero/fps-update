"use client";

import React, { useRef, useState } from "react";
import {
  Step1Data, Step2Data, Step4Data, CalculationResults, CFDWarnings, ExtraCFD,
  toNum, toStr,
} from "@/lib/calculations/cnbop";
import { AlertTriangleIcon, InfoCircleIcon } from "@/components/Calculators/ui/Icons";

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
  onSave: (projectName: string) => Promise<boolean>;
  onReset: () => void;
  onCopyLink?: () => void;
}

const categoryLabels: Record<string, string> = {
  ZL_I: "ZL I", ZL_II: "ZL II", ZL_III: "ZL III",
  ZL_IV: "ZL IV", ZL_V: "ZL V", PM: "PM",
};

const heightLabels: Record<string, string> = {
  N: "niski", SW: "śr.-wysoki", W: "wysoki", WW: "wysokościowy",
};

function ComplianceCard({
  title,
  requiredLabel,
  requiredValue,
  actualLabel,
  actualValue,
  unit,
  ok,
  okLabel,
  failLabel,
}: {
  title: string;
  requiredLabel: string;
  requiredValue: string;
  actualLabel: string;
  actualValue: string;
  unit: string;
  ok: boolean;
  okLabel?: string;
  failLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          ok
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}>
          {ok ? (okLabel ?? "✓ Spełnia") : (failLabel ?? "✗ Nie spełnia")}
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
        <div className="p-5">
          <p className="text-xs text-slate-400 mb-2">{requiredLabel}</p>
          <p className="text-3xl font-bold text-slate-700 dark:text-slate-200 tabular-nums leading-none">
            {requiredValue}
          </p>
          <p className="text-xs text-slate-400 mt-1">{unit}</p>
        </div>
        <div className={`p-5 ${ok ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
          <p className="text-xs text-slate-400 mb-2">{actualLabel}</p>
          <p className={`text-3xl font-bold tabular-nums leading-none ${
            ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}>
            {actualValue}
          </p>
          <p className="text-xs text-slate-400 mt-1">{unit}</p>
        </div>
      </div>
    </div>
  );
}

function SaveSection({ onSave }: { onSave: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(false);
    const ok = await onSave(name.trim());
    setSaving(false);
    if (ok) setSaved(true);
    else setError(true);
  };

  if (saved) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-950/20 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Zapisano do historii raportów</p>
            {name && <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">{name}</p>}
          </div>
        </div>
        <button
          onClick={() => { setSaved(false); setError(false); }}
          className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors shrink-0"
        >
          Zapisz ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Zapisz do historii raportów
      </p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Nazwa projektu (opcjonalnie)"
          value={name}
          onChange={e => { setName(e.target.value); setError(false); }}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-[#0B1120] ${
            error
              ? "border-red-300 dark:border-red-700"
              : "border-slate-200 dark:border-slate-600"
          }`}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
        >
          {saving ? "Zapisuję…" : "Zapisz raport"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">
          Nie udało się zapisać. Sprawdź czy jesteś zalogowany i spróbuj ponownie.
        </p>
      )}
    </div>
  );
}

function MetricPill({ label, value, unit }: { label: string; value: React.ReactNode; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <p className="text-xs text-slate-400 mb-2 leading-tight">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">
        {value}
      </p>
      <p className="text-xs text-slate-400 mt-1">{unit}</p>
    </div>
  );
}

export default function Step5({
  results, step1Data, step2Data, step4Data, akso, abSum,
  actualVent, compCalc, cfnWarnings, extraCFD, anyCFD,
  onDownloadPDF, onDownloadXLSX, onDownloadDOCX, onSave, onReset, onCopyLink,
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

  const isGrav = results.systemType === "GRAVITATIONAL";
  const requiredAcz = results.outputs.Acz || 0;
  const ventOk = actualVent.Acz >= requiredAcz;

  const compReq = results.outputs.Akomp_eff || 0;
  const compOkCalc = compCalc.providedAeff >= compReq;

  return (
    <div id="cnbop-results" className="space-y-6 animate-fade-in">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-400 mb-1">Krok 4 z 4</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Wyniki obliczeń</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onCopyLink && (
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
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
              <div className="absolute top-full mt-2 right-0 w-52 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#111827] overflow-hidden z-50">
                {[
                  { label: "PDF", sub: "Gotowy do druku", ext: ".pdf", onClick: () => { onDownloadPDF(); setDownloadMenuOpen(false); } },
                  { label: "Excel", sub: "Dane do edycji", ext: ".xlsx", onClick: () => { onDownloadXLSX(); setDownloadMenuOpen(false); } },
                  { label: "Word", sub: "Raport edytowalny", ext: ".docx", onClick: () => { onDownloadDOCX(); setDownloadMenuOpen(false); } },
                ].map(({ label, sub, ext, onClick }) => (
                  <button key={ext} onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
                      <span className="block text-xs text-slate-400">{sub}</span>
                    </div>
                    <span className="text-xs text-slate-400">{ext}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SYSTEM BADGE ── */}
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold shrink-0 ${
          isGrav
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-primary/10 text-primary"
        }`}>
          {isGrav ? "G" : "M"}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isGrav ? "Oddymianie grawitacyjne" : "System z nawiewem mechanicznym"}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-slate-400">
            <span>{categoryLabels[step1Data.categoryZL]}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>{heightLabels[step1Data.buildingHeightGroup]}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>{step1Data.numberOfFloorsTotal} kondygnacji</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>A<sub>KS-O</sub> = {toStr(results.AKS_O)} m²</span>
          </div>
        </div>
      </div>

      {/* ── GRAVITATIONAL RESULTS ── */}
      {isGrav && (
        <div className="space-y-4">

          <ComplianceCard
            title="Klapa dymowa"
            requiredLabel="Wymagana minimalna Acz,min"
            requiredValue={toStr(requiredAcz)}
            actualLabel="Dobrana klapa Acz,rz."
            actualValue={toStr(actualVent.Acz)}
            unit="m²"
            ok={ventOk}
          />

          <ComplianceCard
            title="Napowietrzanie (kompensacja)"
            requiredLabel="Wymagana Akomp,min = 1,3 · Aodd,geom"
            requiredValue={toStr(compReq)}
            actualLabel={
              step4Data.compArrangement === "series"
                ? "Zapewniona Aeff — układ szeregowy (min. z otworów)"
                : step4Data.compInputMethod === "calculate"
                  ? "Zapewniona Akomp (geom. dla drzwi / czynna dla innych)"
                  : "Zapewniona Akomp,eff (pow. czynna sumaryczna)"
            }
            actualValue={toStr(compCalc.providedAeff)}
            unit="m²"
            ok={compOkCalc}
            okLabel="✓ Otwory wystarczające"
            failLabel="✗ Otwory za małe"
          />
        </div>
      )}

      {/* ── MECHANICAL RESULTS ── */}
      {!isGrav && (
        <div className="space-y-4">

          {/* Key outputs */}
          <div className="grid grid-cols-3 gap-3">
            <MetricPill
              label="Strumień wymagany Vn,max"
              value={results.outputs.vn_max}
              unit="m³/h"
            />
            <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30 p-4">
              <p className="text-xs text-slate-400 mb-2 leading-tight">Wydajność wentylatora V<sub>went</sub></p>
              <p className="text-2xl font-bold text-primary tabular-nums leading-none">{results.outputs.vWent}</p>
              <p className="text-xs text-slate-400 mt-1">m³/h</p>
            </div>
            <MetricPill
              label="Spręż dyspozycyjny"
              value={results.outputs.sprez}
              unit="Pa"
            />
          </div>

          {/* Flow breakdown */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Obliczenia strumienia nawiewu</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-slate-500 dark:text-slate-400">V<sub>n,min</sub> = 0,2 · A<sub>KS-O</sub> · 3600</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{results.outputs.vn_min} m³/h</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-slate-500 dark:text-slate-400">Nieszczelności przy Δp = 15 Pa &nbsp;<span className="text-slate-400">(V<sub>n_p</sub>)</span></span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{results.outputs.vn_p} m³/h</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 bg-primary/5 dark:bg-primary/10">
                <span className="font-semibold text-primary">Kryterium I &nbsp;— V<sub>n1</sub> = V<sub>n_min</sub> + V<sub>n_p</sub></span>
                <span className="font-bold text-primary tabular-nums">{results.outputs.vn1} m³/h</span>
              </div>
              {results.outputs.vn_v !== undefined && (
                <>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-slate-500 dark:text-slate-400">Ucieczka przez otwarte drzwi &nbsp;<span className="text-slate-400">(V<sub>n_v</sub>)</span></span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{results.outputs.vn_v} m³/h</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5 bg-primary/5 dark:bg-primary/10">
                    <span className="font-semibold text-primary">Kryterium II — V<sub>n2</sub> = V<sub>n_min</sub> + V<sub>n_v</sub></span>
                    <span className="font-bold text-primary tabular-nums">{results.outputs.vn2} m³/h</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between px-5 py-4 bg-slate-800 dark:bg-slate-700">
                <span className="font-semibold text-slate-100">V<sub>n,max</sub> = max(Kryterium I{results.outputs.vn_v !== undefined ? ", II" : ""})</span>
                <span className="font-bold text-white tabular-nums text-base">{results.outputs.vn_max} m³/h</span>
              </div>
            </div>
          </div>

          {/* Supply point guidelines */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <InfoCircleIcon className="h-3.5 w-3.5 text-primary shrink-0" />
              Lokalizacja punktów nawiewnych — rozdz. 6.4 CNBOP
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p>• Prędkość z kratki nawiewnej ≤ <strong>8 m/s</strong></p>
              <p>• Min. <strong>4 m</strong> odstępu od drzwi</p>
              <p>• <strong>1-punkt:</strong> poniżej stropu nad 1. kond. nadz.</p>
              <p>• <strong>Rozproszony:</strong> ≥50% na 1. kond., reszta na 2.</p>
              <p>• <strong>Wysoki:</strong> 40% / 1. kond., reszta na 2. i 3.</p>
            </div>
          </div>

          {/* CFD optimization hint */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 p-5">
            <div className="flex items-start gap-3">
              <InfoCircleIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  Optymalizacja przez symulację CFD (rozdz. 7.2)
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-3 leading-relaxed">
                  Weryfikacja CFD może obniżyć wymaganą wydajność wentylatora nawet o <strong>50–60%</strong>.
                </p>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-blue-600 dark:text-blue-400">
                    Wg obliczeń: <strong className="text-blue-800 dark:text-blue-200">{results.outputs.vWent} m³/h</strong>
                  </span>
                  <span className="text-blue-300 dark:text-blue-600">→</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    Po CFD (est.): <strong className="text-blue-800 dark:text-blue-200">~{Math.round((results.outputs.vWent || 0) * 0.5)} m³/h</strong>
                  </span>
                </div>
                <p className="mt-3 text-xs text-blue-600 dark:text-blue-500">
                  Zapytaj o wycenę:{" "}
                  <a href="mailto:biuro@fp-solutions.pl" className="underline hover:text-blue-800 dark:hover:text-blue-300">biuro@fp-solutions.pl</a>
                  {" · "}
                  <a href="tel:+48790782993" className="underline hover:text-blue-800 dark:hover:text-blue-300">+48 790 782 993</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CFD WARNING ── */}
      {anyCFD && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-700/40 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-700/40">
            <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Wymagana weryfikacja CFD</p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Następujące warunki metody obliczeniowej (rozdz. 7.1) nie są spełnione:
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {cfnWarnings.cfnC && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Otwory przelotowe C = {toStr(toNum(step2Data.C))} m² &gt; 10% (A+B = {toStr(abSum)} m²)</span>
                </li>
              )}
              {cfnWarnings.cfnD && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Dusza schodów D = {toStr(toNum(step2Data.D))} m² &gt; 25% (A+B = {toStr(abSum)} m²)</span>
                </li>
              )}
              {cfnWarnings.cfnAKS && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Rzeczywista A<sub>KS</sub> = {toStr(toNum(step2Data.AKS))} m² przekracza 40 m² na kondygnację</span>
                </li>
              )}
              {extraCFD.zlIVHighAuto && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Budynek ZL IV wysoki — klatka jako pionowa droga ewakuacji (warunek bezwzględny)</span>
                </li>
              )}
              {extraCFD.corrLength && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Korytarz połączony z klatką ma długość &gt; 10 m</span>
                </li>
              )}
              {extraCFD.doorDist && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Odległość od najdalszych drzwi do granicy A<sub>KS-O</sub> przekracza 5 m</span>
                </li>
              )}
              {extraCFD.corrWidth && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Szerokość korytarza stanowiącego wspólną przestrzeń z klatką przekracza 3 m</span>
                </li>
              )}
              {cfnWarnings.cfnSerialDoors && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Napływ grawitacyjny przez dwoje drzwi szeregowe oddalone &gt; 5 m</span>
                </li>
              )}
              {extraCFD.highNoSeparation && (
                <li className="flex gap-2">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>Budynek ZL IV W: korytarze przyległe bez separacji drzwiami</span>
                </li>
              )}
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

      {/* ── SAVE ── */}
      <SaveSection onSave={onSave} />

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
  );
}
