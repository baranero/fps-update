"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
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
import Step1 from "@/components/Calculators/cnbop/Step1";
import Step2 from "@/components/Calculators/cnbop/Step2";
import Step3 from "@/components/Calculators/cnbop/Step3";
import Step4 from "@/components/Calculators/cnbop/Step4";
import Step5 from "@/components/Calculators/cnbop/Step5";

const STEP_LABELS = ["Budynek", "Klatka schodowa", "Typ systemu", "Instalacja", "Wyniki"];

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
  Ae: "", openDoorArea: "",
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
  const [step, setStep] = useState(1);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [step2Errors, setStep2Errors] = useState<string[]>([]);
  const tabsRef = useRef<HTMLDivElement>(null);

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
    const { hasSerialsOverFiveM } = calculateCompGroups(step4Data.compGroups);
    return calculateCFDWarnings(toNum(step2Data.AKS), abSum, toNum(step2Data.C), toNum(step2Data.D), hasSerialsOverFiveM);
  }, [step2Data, step2Validation, abSum, step4Data]);

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
          const sumInvSq = areas.reduce((s, a) => s + 1 / (a * a), 0);
          totalAeff = sumInvSq > 0 ? 1 / Math.sqrt(sumInvSq) : 0;
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

  const getSystemJustification = () => {
    const { categoryZL: cat, buildingHeightGroup: h, expandsEvacuation: expands, stairwellEnclosure: enc } = step1Data;
    if (cat === "ZL_IV") {
      if (h === "W" || h === "WW") return "Zgodnie z rozdz. 4.3 wytycznych CNBOP, budynki mieszkalne wysokie (W) i wysokościowe (WW) wymagają skutecznego zabezpieczenia przed zadymieniem za pomocą zaawansowanego systemu z nawiewem mechanicznym.";
      if (h === "SW" && enc === "non-ppoż") return "Zgodnie z rozdz. 4.2 wytycznych CNBOP, klatki schodowe w budynkach ZL IV średniowysokich, które nie są wydzielone drzwiami PPOŻ, narażone są na bezpośredni napływ dymu z mieszkań. Obligatoryjnie wymagany jest nawiew mechaniczny.";
      if (h === "SW" && enc === "ppoż") return "Zgodnie z rozdz. 4.4 wytycznych CNBOP, klatki w bud. ZL IV średniowysokich (SW), posiadające pełne wydzielenie obudową i drzwiami PPOŻ, dopuszczają standardowe oddymianie grawitacyjne.";
      return "Dla budynków niskich (N) ZL IV wytyczne dopuszczają stosowanie standardowego oddymiania grawitacyjnego jako skutecznej ochrony klatki schodowej.";
    }
    if (h === "W" || h === "WW") return "Zgodnie z rozdz. 4.5 wytycznych CNBOP, klatki schodowe stanowiące drogi ewakuacyjne w budynkach użyteczności publicznej lub PM (wysokich i wysokościowych) wymagają bezwzględnie instalacji nawiewu mechanicznego.";
    if (h === "SW") return "Zgodnie z rozdz. 4.5 wytycznych CNBOP, na klatkach budynków użyteczności publicznej i PM zakwalifikowanych jako Średniowysokie (SW) należy obligatoryjnie stosować system oddymiania z nawiewem mechanicznym.";
    if (h === "N" && expands) return "Jeżeli celem oddymiania ma być powiększenie dopuszczalnej długości dojścia ewakuacyjnego, to nawet w budynkach niskich (N) algorytmy wymuszają zastosowanie wydajniejszego systemu z nawiewem mechanicznym.";
    return "W budynkach niskich użyteczności publicznej/PM, w których system nie służy do powiększania dojść ewakuacyjnych, przepisy uznają za wystarczające wykonanie instalacji oddymiania grawitacyjnego.";
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
    if (newStep === 5 && !hasCalculated) return false;
    setStep(newStep);
    scrollToTabs();
    return true;
  };

  const handleNextStep = () => {
    if (step === 2 && !step2Validation.valid) { setStep2Errors(step2Validation.errors); return; }
    if (step === 2) setStep2Errors([]);
    if (step < 5) { setStep(step + 1); scrollToTabs(); }
  };

  const handleSubmit = () => { setHasCalculated(true); setStep(5); scrollToTabs(); };
  const handleBackStep = () => { if (step > 1) { setStep(step - 1); scrollToTabs(); } };
  const handleReset = () => { setStep(1); setHasCalculated(false); scrollToTabs(); };

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

  return (
    <div className="bg-slate-50 dark:bg-[#0B1120]">
      <div className="container mx-auto px-4 max-w-7xl">
        <Link href="/narzedzia/kalkulatory" className="mb-10 inline-flex items-center text-sm font-semibold text-slate-600 hover:text-primary dark:text-slate-400 transition-colors gap-2.5">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Powrót do bazy kalkulatorów
        </Link>

        {/* Header */}
        <div className="mb-10 rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-3">
            <span className="flex items-center justify-center rounded-xl bg-primary/10 text-primary p-3.5 w-14 h-14 shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-xl md:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">Dobór systemu oddymiania klatki schodowej</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">CNBOP-PIB W-0003:2016</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Wydanie 2 · maj 2019</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
                Kalkulator do obliczeń projektowych systemów oddymiania klatek schodowych. Prowadzi przez klasyfikację budynku, geometrię klatki i dobór urządzeń — klapy dymowej oraz wentylacji nawiewnej — zgodnie z wytyczną CNBOP-PIB W-0003:2016.
              </p>
            </div>
          </div>
        </div>

        {/* Wizard tabs */}
        <div ref={tabsRef} className="mb-10 rounded-full bg-white p-2 shadow-sm border border-slate-100 dark:bg-[#111827] dark:border-slate-800 flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {STEP_LABELS.map((label, idx) => {
            const num = idx + 1;
            const completed = num < step;
            const active = num === step;
            const disabled = num === 5 && !hasCalculated;
            return (
              <button
                key={idx}
                onClick={() => !disabled && validateAndSetStep(num)}
                disabled={disabled}
                className={`group flex-none flex items-center gap-3 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-sm font-bold transition whitespace-nowrap ${
                  active ? "bg-primary text-white shadow-md" :
                  completed ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300" :
                  disabled ? "text-slate-400 cursor-not-allowed opacity-60 dark:text-slate-600" :
                  "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                }`}
              >
                <span className={`flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full border-2 text-[10px] md:text-xs font-black ${
                  active ? "border-white/40 bg-white/20 text-white" :
                  completed ? "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900" :
                  "border-slate-200 bg-slate-100 group-hover:border-primary/20 dark:border-slate-700 dark:bg-slate-800"
                }`}>
                  {num}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Steps */}
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
          <Step3 systemType={systemType} justification={getSystemJustification()} />
        )}
        {step === 4 && (
          <Step4
            systemType={systemType}
            step1Data={step1Data}
            data={step4Data} setData={setStep4Data}
            aeHelper={aeHelper} setAeHelper={setAeHelper}
            actualVent={actualVent}
            requiredAcz={requiredAcz}
          />
        )}
        {step === 5 && results && (
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
          />
        )}

        {/* Bottom navigation */}
        <div className="mt-12 flex flex-col sm:flex-row flex-wrap gap-5 justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-8 md:pt-10">
          <button
            onClick={handleBackStep}
            disabled={step === 1}
            className="flex w-full sm:w-auto justify-center items-center rounded-xl border border-slate-200 px-6 md:px-8 py-3.5 text-sm md:text-base font-bold text-slate-600 transition hover:bg-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← Wstecz
          </button>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 w-full sm:w-auto justify-end">
            {step < 4 && (
              <button onClick={handleNextStep} className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-primary px-8 md:px-10 py-3.5 text-sm md:text-base font-bold text-white transition hover:bg-opacity-90 shadow-sm gap-2">
                Dalej →
              </button>
            )}
            {step === 4 && (
              <button onClick={handleSubmit} className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-green-500 px-8 md:px-10 py-3.5 text-sm md:text-base font-bold text-white transition hover:bg-green-600 shadow-sm gap-2">
                Oblicz Wyniki →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

