"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Step1Data, Step2aData, Step2Data, Step4Data,
  AeHelperState, CFDConditions,
  determineSystemType, classifyBuildingHeight, calculateStaircaseAreas,
  calculateCFDWarnings, calculateGravitational, calculateMechanical,
  calculateCompGroups, validateStep2, CalculationResults,
  toNum, toStr,
} from "@/lib/calculations/cnbop";
import { generateEngineeringPDF, CNBOPReportData } from "@/lib/utils/generatePDF";
import { generateXLSX } from "@/lib/utils/generateXLSX";
import { generateDOCX } from "@/lib/utils/generateDOCX";
import {
  saveHistory, loadHistory, clearHistory, buildShareUrl, parseShareParam,
  HistoryEntry,
} from "@/lib/utils/cnbopHistory";
import Step1 from "@/components/Calculators/cnbop/Step1";
import Step2 from "@/components/Calculators/cnbop/Step2";
import Step4 from "@/components/Calculators/cnbop/Step4";
import Step5 from "@/components/Calculators/cnbop/Step5";

const STEP_LABELS = ["Budynek", "Klatka schodowa", "Instalacja", "Wyniki"];

const initialStep1: Step1Data = {
  categoryZL: "ZL_IV",
  buildingHeightType: "floors",
  buildingHeightValue: 0,
  buildingHeightGroup: "N",
  buildingTypeWT: "standard",
  numberOfFloorsTotal: 0,
  numberOfFloorsAbove: 0,
  numberOfFloorsBelow: 0,
  expandsEvacuation: false,
  stairwellEnclosure: "ppoż",
  selfClosers: true,
};

const initialStep4: Step4Data = {
  ventInputMethod: "dimensions",
  ventWidth: "", ventHeight: "", cv: "0,60", count: "1",
  ventAcz: "", ventAgeom: "",
  compInputMethod: "calculate",
  compArrangement: "parallel",
  compAcz: "",
  compGroups: [{
    id: 1,
    openings: [{ id: 2, type: "door_single", w: "", h: "", area: "" }],
    distances: [],
  }],
  Ae: "", Adrzwi: "",
  installationType: "wall", ductPressureLoss: "",
};

const initialAeHelper: AeHelperState = {
  enabled: false,
  doorsIn: "", doorsOut: "", doorsDouble: "", doorsElevator: "",
  windowLength: "", windowType: "sealed",
  wallExtArea: "", wallExtTightness: "average",
  wallIntArea: "", wallIntTightness: "average",
  wallElevArea: "", wallElevTightness: "average",
  ceilingArea: "", otherAe: "",
};

export default function CNBOPWizardPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [step2Errors, setStep2Errors] = useState<string[]>([]);
  const tabsRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [step1Data, setStep1Data] = useState<Step1Data>(initialStep1);
  const [step2aData, setStep2aData] = useState<Step2aData>({
    calculationMode: "auto",
    flights: [{ id: Date.now(), width: "1,2", length: "2,5" }],
    landings: [{ id: Date.now() + 1, width: "1,5", depth: "1,5" }],
    openings: [],
    cores: [],
  });
  const [step2Data, setStep2Data] = useState<Step2Data>({ AKS: "", A: "", B: "", C: "", D: "" });
  const [step4Data, setStep4Data] = useState<Step4Data>(initialStep4);
  const [cfDCond, setCFDCond] = useState<CFDConditions>({ corrLength: false, doorDist: false, corrWidth: false, highNoSeparation: false });
  const [aeHelper, setAeHelper] = useState<AeHelperState>(initialAeHelper);

  // Load history from localStorage on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Restore state from URL share param
  useEffect(() => {
    const s = searchParams.get("s");
    if (!s) return;
    const snapshot = parseShareParam(s);
    if (!snapshot) return;
    setStep1Data(snapshot.step1Data);
    setStep2aData(snapshot.step2aData);
    setStep2Data(snapshot.step2Data);
    setStep4Data(snapshot.step4Data);
    setCFDCond(snapshot.cfDCond);
    setAeHelper(snapshot.aeHelper);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close history dropdown on outside click
  useEffect(() => {
    if (!historyOpen) return;
    const handler = (e: MouseEvent) => {
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [historyOpen]);

  // Auto-update step2Data from geometries
  const calculatedAreas = useMemo(() => {
    if (step2aData.calculationMode === "auto") return calculateStaircaseAreas(step2aData);
    return null;
  }, [step2aData]);

  useEffect(() => {
    if (calculatedAreas) {
      setStep2Data(prev => ({
        ...prev,
        A: toStr(calculatedAreas.A),
        B: toStr(calculatedAreas.B),
        C: toStr(calculatedAreas.C),
        D: toStr(calculatedAreas.D),
      }));
    }
  }, [calculatedAreas]);

  // Auto-calculate Ae from assistant inputs
  useEffect(() => {
    if (!aeHelper.enabled) return;
    const dIn   = toNum(aeHelper.doorsIn) * 0.01;
    const dOut  = toNum(aeHelper.doorsOut) * 0.02;
    const dDbl  = toNum(aeHelper.doorsDouble) * 0.03;
    const dElev = toNum(aeHelper.doorsElevator) * 0.06;
    const wFactors = { unsealed: 0.00025, sealed: 0.000036, sliding: 0.0001 };
    const wArea = toNum(aeHelper.windowLength) * wFactors[aeHelper.windowType];
    const extFactors = { tight: 0.00007, average: 0.0021, leaky: 0.0042, very_leaky: 0.013 };
    const extArea = toNum(aeHelper.wallExtArea) * extFactors[aeHelper.wallExtTightness];
    const intFactors = { tight: 0.000014, average: 0.0011, leaky: 0.0035 };
    const intArea = toNum(aeHelper.wallIntArea) * intFactors[aeHelper.wallIntTightness];
    const elevFactors = { tight: 0.0018, average: 0.0084, leaky: 0.018 };
    const elevArea = toNum(aeHelper.wallElevArea) * elevFactors[aeHelper.wallElevTightness];
    const ceilArea = toNum(aeHelper.ceilingArea) * 0.000052;
    const calcAe = dIn + dOut + dDbl + dElev + wArea + extArea + intArea + elevArea + ceilArea + toNum(aeHelper.otherAe);
    setStep4Data(prev => ({ ...prev, Ae: toStr(calcAe, 4) }));
  }, [aeHelper]);

  // Derived values
  const allowedBuildingTypes = useMemo(() => {
    const cat = step1Data.categoryZL;
    const base = ["standard", "garage"];
    if (cat === "ZL_II") return [...base, "nursery", "healthcare"];
    if (cat === "ZL_IV") return [...base, "single_family"];
    return base;
  }, [step1Data.categoryZL]);

  const systemType = useMemo(() => determineSystemType(step1Data), [step1Data]);

  const getMinDimensions = (type: string) => {
    if (type === "single_family") return { x: 0.8, y: 0.8 };
    if (type === "nursery")       return { x: 1.2, y: 1.3 };
    if (type === "healthcare")    return { x: 1.4, y: 1.5 };
    if (type === "garage")        return { x: 0.9, y: 0.9 };
    return { x: 1.2, y: 1.5 };
  };
  const minDims = getMinDimensions(step1Data.buildingTypeWT);

  const akso  = useMemo(() => toNum(step2Data.A) + toNum(step2Data.B) + toNum(step2Data.C) + toNum(step2Data.D), [step2Data]);

  const requiredAcz = useMemo(() => {
    const isZL_IV_W = step1Data.categoryZL === "ZL_IV" && step1Data.buildingHeightGroup === "W";
    const factor = isZL_IV_W ? 0.075 : 0.05;
    const minVal  = isZL_IV_W ? 1.5 : 1.0;
    return Math.max(factor * akso, minVal);
  }, [step1Data.categoryZL, step1Data.buildingHeightGroup, akso]);
  const abSum = useMemo(() => toNum(step2Data.A) + toNum(step2Data.B), [step2Data]);

  const step2Validation = useMemo(
    () => validateStep2(step2Data, step2aData, minDims.x, minDims.y),
    [step2Data, step2aData, minDims.x, minDims.y]
  );

  const cfnWarnings = useMemo(() => {
    if (!step2Validation.valid) return { cfnC: false, cfnD: false, cfnAKS: false, cfnSerialDoors: false };
    const isGrav = systemType === "GRAVITATIONAL";
    const hasSerialsOverFiveM = isGrav ? calculateCompGroups(step4Data.compGroups).hasSerialsOverFiveM : false;
    return calculateCFDWarnings(toNum(step2Data.AKS), abSum, toNum(step2Data.C), toNum(step2Data.D), hasSerialsOverFiveM);
  }, [step2Data, step2Validation, abSum, step4Data, systemType]);

  const extraCFD = useMemo(() => ({
    corrLength:       cfDCond.corrLength,
    doorDist:         cfDCond.doorDist,
    corrWidth:        cfDCond.corrWidth,
    zlIVHighAuto:     step1Data.categoryZL === "ZL_IV" && step1Data.buildingHeightGroup === "W",
    highNoSeparation: step1Data.categoryZL === "ZL_IV" && step1Data.buildingHeightGroup === "W" && cfDCond.highNoSeparation,
  }), [cfDCond, step1Data]);

  const anyCFD = Object.values(cfnWarnings).some(Boolean) || Object.values(extraCFD).some(Boolean);

  const actualVent = useMemo(() => {
    const cv = toNum(step4Data.cv) || 0.6;
    if (step4Data.ventInputMethod === "dimensions") {
      const Ageom = toNum(step4Data.ventWidth) * toNum(step4Data.ventHeight) * (toNum(step4Data.count) || 1);
      return { Acz: Ageom * cv, Ageom };
    }
    if (step4Data.ventInputMethod === "geom_cv") {
      const Ageom = toNum(step4Data.ventAgeom);
      return { Acz: Ageom * cv, Ageom };
    }
    const Acz = toNum(step4Data.ventAcz);
    return { Acz, Ageom: cv > 0 ? Acz / cv : 0 };
  }, [step4Data]);

  const results = useMemo<CalculationResults | null>(() => {
    if (!hasCalculated) return null;
    return systemType === "GRAVITATIONAL"
      ? calculateGravitational(step1Data, step2Data, step4Data, actualVent.Ageom)
      : calculateMechanical(step1Data, step2Data, step4Data, actualVent.Ageom);
  }, [hasCalculated, systemType, step1Data, step2Data, step4Data, actualVent]);

  const compCalc = useMemo(() => {
    if (step4Data.compInputMethod === "known_acz") {
      const openings = step4Data.compArrangement === "parallel"
        ? step4Data.compGroups.map(g => g.openings[0]).filter(Boolean)
        : (step4Data.compGroups[0]?.openings ?? []);
      const areas = openings.map(o => toNum(o.area)).filter(a => a > 0);
      let totalAeff = 0;
      if (areas.length > 0) {
        if (step4Data.compArrangement === "parallel") {
          totalAeff = areas.reduce((s, a) => s + a, 0);
        } else {
          totalAeff = Math.min(...areas);
        }
      }
      return { providedAcz: totalAeff, providedAgeom: 0, providedAeff: totalAeff };
    }
    const { totalAgeom, totalAeff } = calculateCompGroups(step4Data.compGroups);
    return { providedAcz: 0, providedAgeom: totalAgeom, providedAeff: totalAeff };
  }, [step4Data]);

  // Handlers
  const handleStep1Change = (key: keyof Step1Data, value: any) => {
    let newState: Partial<Step1Data> = { [key]: value };
    if (key === "categoryZL") {
      const newHeightType = value === "ZL_IV" ? "floors" : "meters";
      newState = { ...newState, buildingHeightType: newHeightType, buildingHeightValue: 0, buildingHeightGroup: "N" };
      const baseAllowed = ["standard", "garage"];
      const allowed = value === "ZL_II" ? [...baseAllowed, "nursery", "healthcare"] : value === "ZL_IV" ? [...baseAllowed, "single_family"] : baseAllowed;
      if (!allowed.includes(step1Data.buildingTypeWT)) newState.buildingTypeWT = "standard";
    }
    if (key === "buildingHeightValue" || key === "categoryZL" || key === "buildingHeightType") {
      const heightVal = key === "buildingHeightValue" ? Number(value.toString().replace(",", ".")) : step1Data.buildingHeightValue;
      const cat = key === "categoryZL" ? value : step1Data.categoryZL;
      const hType = key === "buildingHeightType" ? value : step1Data.buildingHeightType;
      newState = { ...newState, buildingHeightGroup: classifyBuildingHeight(hType, heightVal, cat) };
      if (cat === "ZL_IV") {
        newState = { ...newState, numberOfFloorsAbove: heightVal, numberOfFloorsTotal: heightVal + Number(step1Data.numberOfFloorsBelow) };
      }
    }
    if (key === "numberOfFloorsAbove" || key === "numberOfFloorsBelow") {
      const above = key === "numberOfFloorsAbove" ? Number(value) : Number(step1Data.numberOfFloorsAbove);
      const below = key === "numberOfFloorsBelow" ? Number(value) : Number(step1Data.numberOfFloorsBelow);
      newState = { ...newState, numberOfFloorsTotal: above + below };
    }
    setStep1Data(prev => ({ ...prev, ...newState }));
  };

  const scrollToTabs = () => {
    if (tabsRef.current) {
      const y = tabsRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const validateAndSetStep = (newStep: number) => {
    if (step === 2 && newStep > 2) {
      if (!step2Validation.valid) { setStep2Errors(step2Validation.errors); return false; }
      setStep2Errors([]);
    }
    if (newStep === 4 && !hasCalculated) return false;
    setStep(newStep);
    scrollToTabs();
    return true;
  };

  const handleNextStep = () => {
    if (step === 2 && !step2Validation.valid) { setStep2Errors(step2Validation.errors); return; }
    if (step === 2) setStep2Errors([]);
    if (step < 4) { setStep(step + 1); scrollToTabs(); }
  };

  const handleSubmit = () => {
    setHasCalculated(true);
    setStep(4);
    scrollToTabs();
    const sysType = determineSystemType(step1Data);
    const label = `${step1Data.categoryZL.replace("_", " ")}, ${step1Data.buildingHeightGroup}, ${sysType === "GRAVITATIONAL" ? "graw." : "mech."}`;
    saveHistory({ label, step1Data, step2aData, step2Data, step4Data, cfDCond, aeHelper });
    setHistory(loadHistory());
  };
  const handleBackStep = () => { if (step > 1) { setStep(step - 1); scrollToTabs(); } };
  const handleReset = () => { setStep(1); setHasCalculated(false); scrollToTabs(); };

  const handleCopyLink = () => {
    const url = buildShareUrl({ label: "", step1Data, step2aData, step2Data, step4Data, cfDCond, aeHelper });
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setStep1Data(entry.step1Data);
    setStep2aData(entry.step2aData);
    setStep2Data(entry.step2Data);
    setStep4Data(entry.step4Data);
    setCFDCond(entry.cfDCond);
    setAeHelper(entry.aeHelper);
    setHasCalculated(false);
    setStep(1);
    setHistoryOpen(false);
    scrollToTabs();
  };

  const buildReportData = (): CNBOPReportData | null => {
    if (!results) return null;
    const date = new Date().toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return {
      date,
      step1: { ...step1Data, categoryZL: step1Data.categoryZL.replace("_", " ") },
      step2: { ...step2Data, AKS_O: akso },
      step4: { ...step4Data },
      actualVent,
      compCalc,
      results: { systemType, cfnWarnings, ...results.outputs } as any,
    };
  };

  const handleDownloadPDF = async () => {
    const data = buildReportData();
    if (data) await generateEngineeringPDF(data, `Raport_CNBOP_${Date.now()}.pdf`);
  };
  const handleDownloadXLSX = () => {
    const data = buildReportData();
    if (data) generateXLSX(data, `Raport_CNBOP_${Date.now()}.xlsx`);
  };
  const handleDownloadDOCX = async () => {
    const data = buildReportData();
    if (data) await generateDOCX(data, `Raport_CNBOP_${Date.now()}.docx`);
  };

  const isGrav = systemType === "GRAVITATIONAL";

  return (
    <div>

      {/* ── HEADER BLOCK ── */}
      <div className="rounded-xl bg-slate-900 dark:bg-[#0D1117] mb-8">

        {/* top row: breadcrumb + step tabs */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/narzedzia/kalkulatory"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kalkulatory
            </Link>
            {history.length > 0 && (
              <div ref={historyMenuRef} className="relative">
                <button
                  onClick={() => setHistoryOpen(o => !o)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historia
                  {history.length > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] text-slate-300">
                      {history.length}
                    </span>
                  )}
                </button>
                {historyOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">Ostatnie obliczenia</span>
                      <button
                        onClick={() => { clearHistory(); setHistory([]); setHistoryOpen(false); }}
                        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        Wyczyść
                      </button>
                    </div>
                    <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
                      {history.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => restoreFromHistory(entry)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">{entry.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{entry.date}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">Wczytaj →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <nav className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar" ref={tabsRef}>
            {STEP_LABELS.map((label, idx) => {
              const num = idx + 1;
              const done  = num < step;
              const active = num === step;
              const isDisabled = num === 4 && !hasCalculated;
              return (
                <button
                  key={idx}
                  onClick={() => !isDisabled && validateAndSetStep(num)}
                  disabled={isDisabled}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded text-xs transition-colors disabled:cursor-not-allowed ${
                    active    ? "bg-white text-slate-900 font-semibold" :
                    done      ? "font-medium text-green-400 hover:text-green-300 hover:bg-slate-800" :
                    isDisabled ? "font-medium text-slate-700" :
                    "font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {done
                    ? <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    : <span className={`text-[10px] ${active ? "text-slate-500" : ""}`}>{num}.</span>
                  }
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* bottom row: title */}
        <div className="px-5 py-4 flex items-center gap-3">
          <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <div>
            <span className="text-white text-sm font-medium">
              Dobór systemu oddymiania klatki schodowej
            </span>
            <span className="ml-3 text-slate-600 text-xs">CNBOP-PIB W-0003:2016</span>
          </div>
        </div>

        {/* progress bar */}
        <div className="rounded-b-xl overflow-hidden">
          <div className="h-0.5 bg-slate-800">
            <div
              className="h-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

      </div>

      {/* ── CONTENT ── */}
      <div className="pb-10">

        {step === 1 && (
          <Step1 data={step1Data} onChange={handleStep1Change} allowedBuildingTypes={allowedBuildingTypes} />
        )}
        {step === 2 && (
          <Step2
            step1Data={step1Data}
            step2Data={step2Data} setStep2Data={setStep2Data}
            step2aData={step2aData} setStep2aData={setStep2aData}
            cfDCond={cfDCond} setCFDCond={setCFDCond}
            minDims={minDims}
            step2Errors={step2Errors}
            validation={step2Validation}
            akso={akso} abSum={abSum}
            cfnWarnings={cfnWarnings} extraCFD={extraCFD} anyCFD={anyCFD}
          />
        )}
        {step === 3 && (
          <Step4
            systemType={systemType}
            step1Data={step1Data}
            data={step4Data} setData={setStep4Data}
            aeHelper={aeHelper} setAeHelper={setAeHelper}
            actualVent={actualVent}
            requiredAcz={requiredAcz}
          />
        )}
        {step === 4 && results && (
          <Step5
            results={results}
            step1Data={step1Data}
            step2Data={step2Data}
            step4Data={step4Data}
            akso={akso} abSum={abSum}
            actualVent={actualVent}
            compCalc={compCalc}
            cfnWarnings={cfnWarnings} extraCFD={extraCFD} anyCFD={anyCFD}
            onDownloadPDF={handleDownloadPDF}
            onDownloadXLSX={handleDownloadXLSX}
            onDownloadDOCX={handleDownloadDOCX}
            onReset={handleReset}
            onCopyLink={handleCopyLink}
          />
        )}

        {/* ── INLINE NAV ── */}
        {step < 4 && (
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">

            {/* Wstecz — ghost, de-emphasized */}
            <button
              onClick={handleBackStep}
              disabled={step === 1}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Wstecz
            </button>

            {/* Live values */}
            {akso > 0 && (
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                <span>A<sub>KS-O</sub> <span className="font-medium text-slate-700 dark:text-slate-300 ml-1">{toStr(akso)} m²</span></span>
                <span className="text-slate-200 dark:text-slate-700">|</span>
                <span>A<sub>cz,min</sub> <span className="font-medium text-slate-700 dark:text-slate-300 ml-1">{toStr(requiredAcz)} m²</span></span>
                <span className="text-slate-200 dark:text-slate-700">|</span>
                <span className={`font-medium ${isGrav ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}>
                  {isGrav ? "Grawitacyjny" : "Mechaniczny"}
                </span>
              </div>
            )}

            {/* Dalej / Oblicz wyniki — filled, prominent */}
            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors"
              >
                Dalej
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm shadow-primary/25"
              >
                Oblicz wyniki
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

