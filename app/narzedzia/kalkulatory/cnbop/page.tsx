"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Step1Data,
  Step2aData,
  Step2Data,
  Step4Data,
  determineSystemType,
  classifyBuildingHeight,
  calculateStaircaseAreas,
  calculateCFDWarnings,
  calculateGravitational,
  calculateMechanical,
  validateStep2,
  CalculationResults,
  toNum,
  toStr
} from "@/lib/calculations/cnbop";
import ComponentSuggestions from "@/components/Calculators/ComponentSuggestions";
import { suggestVentilators, suggestDampers } from "@/lib/calculations/mechanicalComponents";
import { generateEngineeringPDF, CNBOPReportData } from "@/lib/utils/generatePDF";
import { generateXLSX } from "@/lib/utils/generateXLSX";
import { generateDOCX } from "@/lib/utils/generateDOCX";

// --- IKONY SVG ---
const AlertTriangleIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const InfoCircleIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const HeightIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L4 7m3-3l3 3M17 8v12m0 0l3-3m-3 3l-3-3" />
  </svg>
);
const StairsIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h4v-4h4v-4h4v-4h4V3" />
  </svg>
);
const PlatformIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h4" />
  </svg>
);
const HoleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
  </svg>
);
const CoreIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728l.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707" />
    <circle cx="12" cy="12" r="4" strokeWidth={2} />
  </svg>
);
const TrashIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>);

const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <span className="group relative inline-flex cursor-help items-center border-b border-dashed border-slate-300 hover:border-primary dark:border-slate-600 pb-px transition-colors">
    {children}
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-max max-w-xs sm:max-w-sm -translate-x-1/2 whitespace-normal rounded-xl bg-slate-900 px-4 py-3 text-left text-xs leading-relaxed text-white opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900 translate-y-2 group-hover:translate-y-0 font-normal">
      {text}
      <div className="absolute top-full left-1/2 -ml-1.5 border-[6px] border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
    </div>
  </span>
);

const UnitInput = ({ label, unit, tooltip, value, onChange, ...props }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace('.', ',');
    if (/^[\d,]*$/.test(val)) {
        if((val.match(/,/g) || []).length > 1) return;
        onChange(val);
    }
  };

  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">
        {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
        {props.required && <span className="text-primary ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          {...props}
          className={`w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342] dark:text-white dark:focus:border-primary input-with-unit ${props.className || ''}`}
        />
        {unit && <span className="input-unit-tag absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none">{unit}</span>}
      </div>
    </div>
  )
};

const categories = [
  { value: "ZL_I", label: "ZL I (Użyteczność publ. >50 os.)" },
  { value: "ZL_II", label: "ZL II (Zdrowie, Przedszkola)" },
  { value: "ZL_III", label: "ZL III (Inne użyteczności publ.)" },
  { value: "ZL_IV", label: "ZL IV (Mieszkalne)" },
  { value: "ZL_V", label: "ZL V (Zamieszkania zbiorowego)" },
  { value: "PM", label: "PM (Produkcyjno-Magazynowe)" },
];

const enclosures = [
  { value: "ppoż", label: "Klatka wydzielona (obudowana z drzwiami min. EI 30)" },
  { value: "non-ppoż", label: "Klatka niewydzielona (brak obudowy lub certyfikowanych drzwi)" },
];

export default function CNBOPWizardPage() {
  const [step, setStep] = useState(1);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [step2Errors, setStep2Errors] = useState<string[]>([]);
  const tabsRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  useEffect(() => {
    if (!downloadMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [downloadMenuOpen]);

  const [step1Data, setStep1Data] = useState<Step1Data>({
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
  });

  const [step2aData, setStep2aData] = useState<Step2aData>({
    calculationMode: "auto",
    flights: [{ id: Date.now(), width: "1,2", length: "2,5" }],
    landings: [{ id: Date.now() + 1, width: "1,5", depth: "1,5" }],
    openings: [],
    cores: [],
  });

  const [step2Data, setStep2Data] = useState<Step2Data>({ AKS: "", A: "", B: "", C: "", D: "" });
  
  const [step4Data, setStep4Data] = useState<Step4Data>({
    ventInputMethod: 'dimensions',
    ventWidth: "", ventHeight: "", cv: "0,60", count: "1",
    ventAcz: "", ventAgeom: "",

    compInputMethod: 'calculate',
    compAcz: "",
    doorConfiguration: 'single',
    serialDistance: "",
    doorLeaves: [{ w: "", h: "", id: Date.now() }],
    otherCompArea: "",

    Ae: "", openDoorArea: "",
    installationType: "wall", ductPressureLoss: "",
  });

  const [cfDCond, setCFDCond] = useState({
    corrLength: false,
    doorDist: false,
    corrWidth: false,
    highNoSeparation: false,
  });

  const [aeHelper, setAeHelper] = useState({
    enabled: false,
    doorsIn: "", doorsOut: "", doorsDouble: "", doorsElevator: "",
    windowLength: "", windowType: "sealed" as "unsealed" | "sealed" | "sliding",
    wallExtArea: "", wallExtTightness: "average" as "tight" | "average" | "leaky" | "very_leaky",
    wallIntArea: "", wallIntTightness: "average" as "tight" | "average" | "leaky",
    wallElevArea: "", wallElevTightness: "average" as "tight" | "average" | "leaky",
    ceilingArea: "", otherAe: ""
  });

  const allowedBuildingTypes = useMemo(() => {
    const cat = step1Data.categoryZL;
    const base = ['standard', 'garage'];
    if (cat === 'ZL_II') return [...base, 'nursery', 'healthcare'];
    if (cat === 'ZL_IV') return [...base, 'single_family'];
    return base;
  }, [step1Data.categoryZL]);

  const systemType = useMemo(() => determineSystemType(step1Data), [step1Data]);

  const getMinDimensions = (type: string) => {
    if (type === 'single_family') return { x: 0.8, y: 0.8 };
    if (type === 'nursery')       return { x: 1.2, y: 1.3 };
    if (type === 'healthcare')    return { x: 1.4, y: 1.5 };
    if (type === 'garage')        return { x: 0.9, y: 0.9 };
    return { x: 1.2, y: 1.5 };
  };
  const minDims = getMinDimensions(step1Data.buildingTypeWT);

  const calculatedAreas = useMemo(() => {
    if (step2aData.calculationMode === "auto") {
      return calculateStaircaseAreas(step2aData);
    }
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

  useEffect(() => {
    if (aeHelper.enabled) {
      const dIn = toNum(aeHelper.doorsIn) * 0.01;
      const dOut = toNum(aeHelper.doorsOut) * 0.02;
      const dDouble = toNum(aeHelper.doorsDouble) * 0.03;
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
      const calcAe = dIn + dOut + dDouble + dElev + wArea + extArea + intArea + elevArea + ceilArea + toNum(aeHelper.otherAe);
      setStep4Data(prev => ({ ...prev, Ae: toStr(calcAe, 4) }));
    }
  }, [aeHelper]);

  const akso = useMemo(() => toNum(step2Data.A) + toNum(step2Data.B) + toNum(step2Data.C) + toNum(step2Data.D), [step2Data]);
  const abSum = useMemo(() => toNum(step2Data.A) + toNum(step2Data.B), [step2Data]);
  
  const step2Validation = useMemo(() => validateStep2(step2Data, step2aData, minDims.x, minDims.y), [step2Data, step2aData, minDims.x, minDims.y]);
  const cfnWarnings = useMemo(
    () => step2Validation.valid ? calculateCFDWarnings(toNum(step2Data.AKS), abSum, toNum(step2Data.C), toNum(step2Data.D), step4Data.doorConfiguration === 'serial' && toNum(step4Data.serialDistance) > 5) : { cfnC: false, cfnD: false, cfnAKS: false, cfnSerialDoors: false },
    [step2Data, step2Validation, abSum, step4Data]
  );

  const extraCFD = useMemo(() => ({
    corrLength:        cfDCond.corrLength,
    doorDist:          cfDCond.doorDist,
    corrWidth:         cfDCond.corrWidth,
    zlIVHighAuto:      step1Data.categoryZL === 'ZL_IV' && step1Data.buildingHeightGroup === 'W',
    highNoSeparation:  step1Data.categoryZL === 'ZL_IV' && step1Data.buildingHeightGroup === 'W' && cfDCond.highNoSeparation,
  }), [cfDCond, step1Data]);

  const anyCFD = Object.values(cfnWarnings).some(Boolean) || Object.values(extraCFD).some(Boolean);

  const actualVent = useMemo(() => {
    let Acz = 0;
    let Ageom = 0;
    const cv = toNum(step4Data.cv) || 0.6;

    if (step4Data.ventInputMethod === 'dimensions') {
      const w = toNum(step4Data.ventWidth);
      const h = toNum(step4Data.ventHeight);
      const c = toNum(step4Data.count) || 1;
      Ageom = w * h * c;
      Acz = Ageom * cv;
    } else if (step4Data.ventInputMethod === 'geom_cv') {
      Ageom = toNum(step4Data.ventAgeom);
      Acz = Ageom * cv;
    } else if (step4Data.ventInputMethod === 'acz_cv') {
      Acz = toNum(step4Data.ventAcz);
      Ageom = cv > 0 ? Acz / cv : 0;
    }
    return { Acz, Ageom };
  }, [step4Data]);

  const results = useMemo<CalculationResults | null>(() => {
    if (!hasCalculated) return null;
    return systemType === "GRAVITATIONAL" 
      ? calculateGravitational(step1Data, step2Data, step4Data, actualVent.Ageom) 
      : calculateMechanical(step1Data, step2Data, step4Data, actualVent.Ageom);
  }, [hasCalculated, systemType, step1Data, step2Data, step4Data, actualVent]);

  const compCalc = useMemo(() => {
    let providedAcz = 0;
    let providedAgeom = 0;

    if (step4Data.compInputMethod === 'known_acz') {
      providedAcz = toNum(step4Data.compAcz);
    } else {
      if (step4Data.doorConfiguration === 'other') {
        providedAgeom = toNum(step4Data.otherCompArea);
      } else if (step4Data.doorConfiguration === 'serial') {
        // W szeregu nie sumujemy, liczy się najmniejsze "światło" przejścia
        const areas = step4Data.doorLeaves.map(d => toNum(d.w) * toNum(d.h));
        providedAgeom = areas.length > 0 ? Math.min(...areas) : 0;
      } else {
        // Pozostałe układy (np. 2 niezależne) – sumujemy
        providedAgeom = step4Data.doorLeaves.reduce((sum, d) => sum + (toNum(d.w) * toNum(d.h)), 0);
      }
    }
    return { providedAcz, providedAgeom };
  }, [step4Data]);

  const handleStep1Change = (key: keyof Step1Data, value: any) => {
    let newState: Partial<Step1Data> = { [key]: value };
    if (key === "categoryZL") {
      const newHeightType = value === "ZL_IV" ? "floors" : "meters";
      newState = { ...newState, buildingHeightType: newHeightType, buildingHeightValue: 0, buildingHeightGroup: "N" };
      const baseAllowed = ['standard', 'garage'];
      let allowed = baseAllowed;
      if (value === 'ZL_II') allowed = [...baseAllowed, 'nursery', 'healthcare'];
      if (value === 'ZL_IV') allowed = [...baseAllowed, 'single_family'];
      if (!allowed.includes(step1Data.buildingTypeWT)) {
        newState.buildingTypeWT = "standard";
      }
    }
    if (key === "buildingHeightValue" || key === "categoryZL" || key === "buildingHeightType") {
      const heightVal = key === "buildingHeightValue" ? Number(value.toString().replace(',', '.')) : step1Data.buildingHeightValue;
      const cat = key === "categoryZL" ? value : step1Data.categoryZL;
      const hType = key === "buildingHeightType" ? value : step1Data.buildingHeightType;
      newState = { ...newState, buildingHeightGroup: classifyBuildingHeight(hType, heightVal, cat) };
      // Dla ZL IV liczba kondygnacji nadziemnych = buildingHeightValue
      if (cat === 'ZL_IV') {
        newState = { ...newState, numberOfFloorsAbove: heightVal, numberOfFloorsTotal: heightVal + Number(step1Data.numberOfFloorsBelow) };
      }
    }
    if (key === "numberOfFloorsAbove" || key === "numberOfFloorsBelow") {
      const above = key === "numberOfFloorsAbove" ? Number(value) : Number(step1Data.numberOfFloorsAbove);
      const below = key === "numberOfFloorsBelow" ? Number(value) : Number(step1Data.numberOfFloorsBelow);
      newState = { ...newState, numberOfFloorsTotal: above + below };
    }
    setStep1Data((prev: Step1Data) => ({ ...prev, ...newState }));
  };

  const updateArrayData = (section: 'flights' | 'landings' | 'openings' | 'cores', id: number, field: string, val: string) => {
    setStep2aData(p => ({ ...p, [section]: p[section].map((item: any) => item.id === id ? { ...item, [field]: val } : item) }));
  };
  const addArrayItem = (section: 'flights' | 'landings' | 'openings' | 'cores') => {
    const newItem = section === 'flights' ? { width: "", length: "" } : section === 'landings' ? { width: "", depth: "" } : { area: "" };
    setStep2aData(p => ({ ...p, [section]: [...p[section], { id: Date.now(), ...newItem }] }));
  };
  const removeArrayItem = (section: 'flights' | 'landings' | 'openings' | 'cores', id: number) => {
    setStep2aData(p => ({ ...p, [section]: p[section].filter((item: any) => item.id !== id) }));
  };

  const handleDoorLeafChange = (id: number, field: 'w' | 'h', val: string) => {
    setStep4Data(p => ({ ...p, doorLeaves: p.doorLeaves.map(d => d.id === id ? { ...d, [field]: val } : d)}));
  };

  const handleDoorConfigChange = (config: string) => {
    let leaves = [{ w: "", h: "", id: Date.now() }];
    if (config === 'double' || config === 'two_independent' || config === 'serial') {
       leaves.push({ w: "", h: "", id: Date.now() + 1 });
    }
    setStep4Data(p => ({ ...p, doorConfiguration: config as any, doorLeaves: leaves }));
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

  const getSystemJustification = () => {
    const cat = step1Data.categoryZL; const h = step1Data.buildingHeightGroup; const expands = step1Data.expandsEvacuation; const enc = step1Data.stairwellEnclosure;
    if (cat === 'ZL_IV') {
      if (h === 'W' || h === 'WW') return "Zgodnie z rozdz. 4.3 wytycznych CNBOP, budynki mieszkalne wysokie (W) i wysokościowe (WW) wymagają skutecznego zabezpieczenia przed zadymieniem za pomocą zaawansowanego systemu z nawiewem mechanicznym.";
      if (h === 'SW' && enc === 'non-ppoż') return "Zgodnie z rozdz. 4.2 wytycznych CNBOP, klatki schodowe w budynkach ZL IV średniowysokich, które nie są wydzielone drzwiami PPOŻ, narażone są na bezpośredni napływ dymu z mieszkań. Obligatoryjnie wymagany jest nawiew mechaniczny.";
      if (h === 'SW' && enc === 'ppoż') return "Zgodnie z rozdz. 4.4 wytycznych CNBOP, klatki w bud. ZL IV średniowysokich (SW), posiadające pełne wydzielenie obudową i drzwiami PPOŻ, dopuszczają standardowe oddymianie grawitacyjne.";
      if (h === 'N') return "Dla budynków niskich (N) ZL IV wytyczne dopuszczają stosowanie standardowego oddymiania grawitacyjnego jako skutecznej ochrony klatki schodowej.";
    } else {
      if (h === 'W' || h === 'WW') return "Zgodnie z rozdz. 4.5 wytycznych CNBOP, klatki schodowe stanowiące drogi ewakuacyjne w budynkach użyteczności publicznej lub PM (wysokich i wysokościowych) wymagają bezwzględnie instalacji nawiewu mechanicznego.";
      if (h === 'SW') return "Zgodnie z rozdz. 4.5 wytycznych CNBOP, na klatkach budynków użyteczności publicznej i PM zakwalifikowanych jako Średniowysokie (SW) należy obligatoryjnie stosować system oddymiania z nawiewem mechanicznym.";
      if (h === 'N' && expands) return "Jeżeli celem oddymiania ma być powiększenie dopuszczalnej długości dojścia ewakuacyjnego, to nawet w budynkach niskich (N) algorytmy wymuszają zastosowanie wydajniejszego systemu z nawiewem mechanicznym.";
      if (h === 'N' && !expands) return "W budynkach niskich użyteczności publicznej/PM, w których system nie służy do powiększania dojść ewakuacyjnych, przepisy uznają za wystarczające wykonanie instalacji oddymiania grawitacyjnego.";
    }
    return "";
  };

  const handleDownloadPDF = async () => {
    const reportData = buildReportData();
    if (!reportData) return;
    await generateEngineeringPDF(reportData, `Raport_CNBOP_${new Date().getTime()}.pdf`);
  };

  const buildReportData = (): CNBOPReportData | null => {
    if (!results) return null;
    const polishDate = new Date().toLocaleDateString("pl-PL", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return {
      date: polishDate,
      step1: { ...step1Data, categoryZL: step1Data.categoryZL.replace("_", " ") },
      step2: { ...step2Data, AKS_O: akso },
      step4: { ...step4Data },
      actualVent,
      compCalc,
      results: { systemType, cfnWarnings, ...results.outputs } as any,
    };
  };

  const handleDownloadXLSX = () => {
    const reportData = buildReportData();
    if (!reportData) return;
    generateXLSX(reportData, `Raport_CNBOP_${new Date().getTime()}.xlsx`);
  };

  const handleDownloadDOCX = async () => {
    const reportData = buildReportData();
    if (!reportData) return;
    await generateDOCX(reportData, `Raport_CNBOP_${new Date().getTime()}.docx`);
  };

  const stepLabels = ["Budynek", "Klatka schodowa", "Typ systemu", "Instalacja", "Wyniki"];

  return (
    <div className="pb-24 pt-32 bg-slate-50 dark:bg-[#0B1120]">
      <div className="container mx-auto px-4 max-w-7xl">
        <Link href="/narzedzia/kalkulatory" className="mb-10 inline-flex items-center text-sm font-semibold text-slate-600 hover:text-primary dark:text-slate-400 transition-colors gap-2.5">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Powrót do bazy kalkulatorów
        </Link>

        {/* HEADER */}
        <div className="mb-10 rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-3">
            <span className="flex items-center justify-center rounded-xl bg-primary/10 text-primary p-3.5 w-14 h-14 shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-xl md:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">Dobór systemu oddymiania klatki schodowej</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">CNBOP-PIB W-0003:2016</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Wydanie 2 · maj 2019</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">Kalkulator do obliczeń projektowych systemów oddymiania klatek schodowych. Prowadzi przez klasyfikację budynku, geometrię klatki i dobór urządzeń — klapy dymowej oraz wentylacji nawiewnej — zgodnie z wytyczną CNBOP-PIB W-0003:2016.</p>
            </div>
          </div>
        </div>

        {/* WIZARD TABS */}
        <div ref={tabsRef} className="mb-10 rounded-full bg-white p-2 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800 flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {stepLabels.map((label, idx) => {
            const num = idx + 1; const completed = num < step; const active = num === step; const resultsDisabled = num === 5 && !hasCalculated;
            return (
              <button key={idx} onClick={() => !resultsDisabled && validateAndSetStep(num)} disabled={resultsDisabled}
                className={`group flex-none flex items-center gap-3 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-sm font-bold transition whitespace-nowrap ${active ? "bg-primary text-white shadow-md" : completed ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300" : resultsDisabled ? "text-slate-400 cursor-not-allowed opacity-60 dark:text-slate-600" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"}`}>
                <span className={`flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full border-2 text-[10px] md:text-xs font-black ${active ? "border-white/40 bg-white/20 text-white" : completed ? "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900" : "border-slate-200 bg-slate-100 group-hover:border-primary/20 dark:border-slate-700 dark:bg-slate-800"}`}>{num}</span> {label}
              </button>
            );
          })}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
              <h2 className="mb-6 md:mb-8 text-base md:text-lg font-bold text-slate-950 dark:text-white">Krok 1: Charakterystyka i Wydzielenie Budynku</h2>
              <div className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"><Tooltip text="Przeznaczenie i sposób użytkowania wg WT.">Kategoria zagrożenia ludzi (ZL)</Tooltip></label>
                    <select value={step1Data.categoryZL} onChange={(e) => handleStep1Change("categoryZL", e.target.value as any)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342]">
                      {categories.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"><Tooltip text="Definiuje prawne minima dla gabarytów schodów i spoczników wg WT § 68. Opcje dopasowują się do wybranej kategorii ZL.">Rygor wymiarowy schodów</Tooltip></label>
                    <select value={step1Data.buildingTypeWT} onChange={(e) => handleStep1Change("buildingTypeWT", e.target.value as any)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342]">
                      <option value="standard">Standard (bieg 1,2 m, spocznik 1,5 m)</option>
                      <option value="nursery" disabled={!allowedBuildingTypes.includes('nursery')}>Przedszkola i żłobki (bieg 1,2 m, spocznik 1,3 m)</option>
                      <option value="healthcare" disabled={!allowedBuildingTypes.includes('healthcare')}>Budynki opieki zdrowotnej (bieg 1,4 m, spocznik 1,5 m)</option>
                      <option value="single_family" disabled={!allowedBuildingTypes.includes('single_family')}>Jednorodzinne / zabudowa zagrodowa (bieg 0,8 m, spocznik 0,8 m)</option>
                      <option value="garage">Garaże / usługi ≤10 os. (bieg 0,9 m, spocznik 0,9 m)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  <UnitInput label={step1Data.categoryZL === "ZL_IV" ? "Wysokość w kondygnacjach nadziemnych" : "Wysokość budynku"} unit={step1Data.categoryZL === "ZL_IV" ? "kond." : "m"} required value={step1Data.buildingHeightValue} onChange={(val: string) => handleStep1Change("buildingHeightValue", val)} />
                  {step1Data.categoryZL === "ZL_IV" ? (
                    <div>
                      <UnitInput
                        label="Kondygnacje podziemne klatki schodowej"
                        tooltip="Liczba kondygnacji poniżej poziomu terenu obsługiwanych przez tę klatkę. Suma z kondygnacjami nadziemnymi daje łączną liczbę kondygnacji."
                        unit="kond."
                        value={step1Data.numberOfFloorsBelow}
                        onChange={(val: string) => handleStep1Change("numberOfFloorsBelow", val)}
                        placeholder="np. 1"
                      />
                      {step1Data.numberOfFloorsTotal > 0 && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          Łącznie: <strong className="text-primary">{step1Data.numberOfFloorsTotal}</strong> kond. (nadziemne: {step1Data.numberOfFloorsAbove} + podziemne: {step1Data.numberOfFloorsBelow})
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <Tooltip text="Łączna liczba kondygnacji obsługiwanych przez system — kluczowa do wyznaczenia ciśnień.">Kondygnacje klatki schodowej</Tooltip>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <UnitInput label="Nadziemne" unit="kond." value={step1Data.numberOfFloorsAbove} onChange={(val: string) => handleStep1Change("numberOfFloorsAbove", val)} placeholder="np. 5" />
                        <UnitInput label="Podziemne" unit="kond." value={step1Data.numberOfFloorsBelow} onChange={(val: string) => handleStep1Change("numberOfFloorsBelow", val)} placeholder="np. 1" />
                      </div>
                      {step1Data.numberOfFloorsTotal > 0 && (
                        <p className="mt-1.5 text-xs text-slate-500">Łącznie: <strong className="text-primary">{step1Data.numberOfFloorsTotal}</strong> kondygnacji</p>
                      )}
                    </div>
                  )}
                </div>

                {toNum(step1Data.buildingHeightValue) > 0 && (
                  <div className="rounded-xl bg-primary/5 p-4 md:p-5 border border-primary/10 flex items-center gap-3.5 animate-fade-in">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <HeightIcon className="h-4 w-4 text-primary" />
                    </span>
                    <p className="text-sm md:text-base font-semibold text-primary">Klasyfikacja wysokości § 8 WT: <strong>{step1Data.buildingHeightGroup === "N" ? "Niski (N)" : step1Data.buildingHeightGroup === "SW" ? "Średniowysoki (SW)" : step1Data.buildingHeightGroup === "W" ? "Wysoki (W)" : "Wysokościowy (WW)"}</strong></p>
                  </div>
                )}

                <div className="space-y-3 md:space-y-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-2">Wydzielenie pożarowe klatki schodowej</label>
                  <select value={step1Data.stairwellEnclosure} onChange={(e) => handleStep1Change("stairwellEnclosure", e.target.value as any)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-[#1E2342]">
                    {enclosures.map((enc) => <option key={enc.value} value={enc.value}>{enc.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <div className="rounded-xl border border-slate-100 p-4 md:p-5 dark:border-slate-800 bg-slate-50 dark:bg-[#1C213E]">
                    <div className="flex items-start gap-3 md:gap-4">
                      <input type="checkbox" checked={step1Data.expandsEvacuation} onChange={(e) => handleStep1Change("expandsEvacuation", e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0" />
                      <div>
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Powiększanie dojścia ewakuacyjnego</label>
                        <p className="text-xs text-slate-500 mt-1">Czy system służy do powiększania prawnej długości dojścia w budynku?</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4 md:p-5 dark:border-slate-800 bg-slate-50 dark:bg-[#1C213E]">
                    <div className="flex items-start gap-3 md:gap-4">
                      <input type="checkbox" checked={step1Data.selfClosers} onChange={(e) => handleStep1Change("selfClosers", e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0" />
                      <div>
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Wyposażenie drzwi w samozamykacze</label>
                        <p className="text-xs text-slate-500 mt-1">Czy wszystkie drzwi prowadzące na klatkę schodową (w tym wyjściowe) posiadają sprawne samozamykacze?</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!step1Data.selfClosers && (
                  <div className="rounded-xl bg-amber-50 p-4 md:p-5 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 flex items-start gap-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 mt-0.5">
                      <AlertTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </span>
                    <p className="text-xs md:text-sm text-amber-900 dark:text-amber-300 leading-relaxed">Brak pełnego zestawu samozamykaczy wymusza obliczanie dodatkowego strumienia ucieczki (V<sub>n_v</sub>) wg rozdz. 6.4.3. Skutkuje to wyższą wymaganą mocą wentylatora.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-primary/30 dark:bg-dark dark:border-primary/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
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
                    onChange={(val: string) => setStep2Data(p => ({ ...p, AKS: val}))}
                    placeholder="np. 15,00"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
              <div className="flex flex-col lg:flex-row lg:justify-between gap-6 mb-6 lg:mb-8 lg:items-center border-b border-slate-100 dark:border-slate-800 pb-6 lg:pb-8">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-950 dark:text-white">Krok 2: Powierzchnia obliczeniowa (A<sub>KS-O</sub>)</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-1.5">Geometria biegów i spoczników do obliczeń wymiarów instalacji oddymiającej.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                   <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Tryb wprowadzania:</label>
                   <select value={step2aData.calculationMode} onChange={(e) => setStep2aData({ ...step2aData, calculationMode: e.target.value as any })} className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-[#1E2342]">
                     <option value="auto">Z wymiarów elementów (Auto)</option>
                     <option value="manual">Sumaryczna pow. (Manual)</option>
                   </select>
                </div>
              </div>

              {step2aData.calculationMode === "auto" ? (
                <div className="space-y-8 md:space-y-10 animate-fade-in">
                  <div className="rounded-2xl bg-slate-50 p-5 md:p-6 dark:bg-[#1C213E] border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <StairsIcon className="h-4 w-4 text-primary" />
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Biegi schodowe</h3>
                          <p className="text-xs text-slate-400">Obszar A — rzuty poziome biegów</p>
                        </div>
                      </div>
                      <button onClick={() => addArrayItem('flights')} className="text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 py-2 px-4 rounded-lg transition border dark:bg-dark dark:border-slate-700 dark:text-slate-300 w-full sm:w-auto">+ Dodaj bieg</button>
                    </div>
                    <div className="space-y-4">
                      {step2aData.flights.map((f, idx) => (
                        <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white dark:bg-dark p-4 md:p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-bold text-slate-400 w-6">#{idx + 1}</span>
                          <UnitInput label={`Szer. (x) [min ${toStr(minDims.x)}m]`} unit="m" value={f.width} onChange={(val: string) => updateArrayData('flights', f.id, 'width', val)} className={toNum(f.width) > 0 && toNum(f.width) < minDims.x ? "!border-red-400 focus:ring-red-100" : ""} />
                          <UnitInput label="Długość rzutu" unit="m" value={f.length} onChange={(val: string) => updateArrayData('flights', f.id, 'length', val)} />
                          <button onClick={() => removeArrayItem('flights', f.id)} disabled={step2aData.flights.length === 1} className="text-red-400 hover:text-red-600 p-2 md:mt-6 self-end sm:self-auto transition-colors disabled:opacity-30"><TrashIcon /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5 md:p-6 dark:bg-[#1C213E] border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <PlatformIcon className="h-4 w-4 text-primary" />
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Spoczniki</h3>
                          <p className="text-xs text-slate-400">Obszar B — wymiarowe poziomy spocznikowe</p>
                        </div>
                      </div>
                      <button onClick={() => addArrayItem('landings')} className="text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 py-2 px-4 rounded-lg transition border dark:bg-dark dark:border-slate-700 dark:text-slate-300 w-full sm:w-auto">+ Dodaj spocznik</button>
                    </div>
                    <div className="space-y-4">
                      {step2aData.landings.map((l, idx) => (
                        <div key={l.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white dark:bg-dark p-4 md:p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-bold text-slate-400 w-6">#{idx + 1}</span>
                          <UnitInput label={`Szer. (y) [min ${toStr(minDims.y)}m i y ≥ x]`} unit="m" value={l.width} onChange={(val: string) => updateArrayData('landings', l.id, 'width', val)} className={toNum(l.width) > 0 && toNum(l.width) < minDims.y ? "!border-red-400 focus:ring-red-100" : ""} />
                          <UnitInput label="Głębokość z rzutu" unit="m" value={l.depth} onChange={(val: string) => updateArrayData('landings', l.id, 'depth', val)} />
                          <button onClick={() => removeArrayItem('landings', l.id)} disabled={step2aData.landings.length === 1} className="text-red-400 hover:text-red-600 p-2 md:mt-6 self-end sm:self-auto transition-colors disabled:opacity-30"><TrashIcon /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="rounded-2xl bg-white p-5 md:p-6 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
                      <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                            <HoleIcon className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Otwory zrzutowe (<Tooltip text="Otwory pionowe w stropach klatki (inne niż dusza).">C</Tooltip>)</h4>
                        </div>
                        <button onClick={() => addArrayItem('openings')} className="text-xs font-bold bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg dark:bg-slate-800 dark:text-slate-300">+ Dodaj</button>
                      </div>
                      <div className="space-y-3">
                        {step2aData.openings.map((o) => (
                          <div key={o.id} className="flex gap-3 items-center">
                            <UnitInput unit="m²" value={o.area} onChange={(val: string) => updateArrayData('openings', o.id, 'area', val)} placeholder="0,00" className="w-full text-sm py-2 px-4" />
                            <button onClick={() => removeArrayItem('openings', o.id)} className="text-red-400 hover:text-red-600 p-1.5 transition-colors"><TrashIcon /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-5 md:p-6 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
                      <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                            <CoreIcon className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Dusza schodów (<Tooltip text="Centralny prześwit pionowy.">D</Tooltip>)</h4>
                        </div>
                        <button onClick={() => addArrayItem('cores')} className="text-xs font-bold bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg dark:bg-slate-800 dark:text-slate-300">+ Dodaj</button>
                      </div>
                      <div className="space-y-3">
                        {step2aData.cores.map((c) => (
                          <div key={c.id} className="flex gap-3 items-center">
                            <UnitInput unit="m²" value={c.area} onChange={(val: string) => updateArrayData('cores', c.id, 'area', val)} placeholder="0,00" className="w-full text-sm py-2 px-4" />
                            <button onClick={() => removeArrayItem('cores', c.id)} className="text-red-400 hover:text-red-600 p-1.5 transition-colors"><TrashIcon /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8 animate-fade-in">
                  <div className="rounded-xl bg-blue-50/50 p-4 md:p-5 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1.5">
                      <InfoCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Wymogi § 68 WT dla tego obiektu: x = {toStr(minDims.x)}m, y = {toStr(minDims.y)}m</p>
                    </div>
                    <p className="text-xs text-blue-800/80 dark:text-blue-400 leading-relaxed">Upewnij się, że sumaryczne pola A i B bazują na minimalnych dopuszczalnych gabarytach rzutów.</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <UnitInput label="Suma rzutów biegów (A)" unit="m²" required value={step2Data.A} onChange={(val: string) => setStep2Data(p => ({...p, A: val}))} />
                    <UnitInput label="Suma wymiarowych spoczników (B)" unit="m²" required value={step2Data.B} onChange={(val: string) => setStep2Data(p => ({...p, B: val}))} />
                    <UnitInput label="Dusza schodów (D)" unit="m²" value={step2Data.D} onChange={(val: string) => setStep2Data(p => ({...p, D: val}))} />
                    <UnitInput label="Otwory przelotowe (C)" unit="m²" value={step2Data.C} onChange={(val: string) => setStep2Data(p => ({...p, C: val}))} />
                  </div>
                </div>
              )}

              {/* Warunki środowiskowe do weryfikacji CFD */}
              <div className="mt-8 md:mt-10 rounded-2xl bg-slate-50 dark:bg-[#1C213E] border border-slate-100 dark:border-slate-800 p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Warunki otoczenia klatki — weryfikacja CFD (rozdz. 7.1 wytycznych)</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">Zaznacz każdy warunek, który NIE jest spełniony. Jeżeli którykolwiek jest zaznaczony, standardowy algorytm nie wystarczy — wymagana jest symulacja CFD.</p>
                {step1Data.categoryZL === 'ZL_IV' && step1Data.buildingHeightGroup === 'W' && (
                  <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 p-3.5 flex items-start gap-2.5 animate-fade-in">
                    <AlertTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-red-800 dark:text-red-300 leading-snug">Budynek ZL IV wysoki (W): dla klatek schodowych w budynkach wysokich ZL IV wymagana jest symulacja CFD bez względu na geometrię (pkt 7.1 wytycznych).</p>
                  </div>
                )}
                <div className="space-y-3">
                  {([
                    { key: "corrLength",  label: "Korytarz / przestrzeń połączona z klatką ma długość > 10 m" },
                    { key: "doorDist",    label: "Odległość od jakichkolwiek drzwi do granicy A_KS przekracza 5 m" },
                    { key: "corrWidth",   label: "Szerokość korytarza stanowiącego wspólną przestrzeń z klatką przekracza 3 m" },
                  ] as { key: keyof typeof cfDCond; label: string }[]).map(({ key, label }) => (
                    <label key={key} className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 transition ${cfDCond[key] ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800" : "border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-dark"}`}>
                      <input type="checkbox" checked={cfDCond[key]} onChange={e => setCFDCond(p => ({ ...p, [key]: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-500 focus:ring-red-400 shrink-0" />
                      <span className={`text-xs font-medium leading-snug ${cfDCond[key] ? "text-red-800 dark:text-red-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>{label}</span>
                    </label>
                  ))}
                  {step1Data.categoryZL === 'ZL_IV' && step1Data.buildingHeightGroup === 'W' && (
                    <label className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 transition ${cfDCond.highNoSeparation ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800" : "border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-dark"}`}>
                      <input type="checkbox" checked={cfDCond.highNoSeparation} onChange={e => setCFDCond(p => ({ ...p, highNoSeparation: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-500 focus:ring-red-400 shrink-0" />
                      <span className={`text-xs font-medium leading-snug ${cfDCond.highNoSeparation ? "text-red-800 dark:text-red-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>ZL IV W: korytarze przyległe NIE są oddzielone drzwiami</span>
                    </label>
                  )}
                </div>
              </div>

              {step2Errors.length > 0 && (
                <div className="rounded-xl bg-red-50 p-5 md:p-6 mt-8 border border-red-200 dark:bg-red-950/30 dark:border-red-800 text-red-900 dark:text-red-300 animate-fade-in">
                  <p className="mb-3 font-bold flex items-center gap-2">Wymagana korekta danych (§ 68 WT / rozdz. 6.2 CNBOP):</p>
                  <ul className="list-inside list-disc space-y-1.5 text-xs md:text-sm font-medium">
                    {step2Errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              {step2Validation.valid && (
                <div className="mt-8 md:mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div className="rounded-xl bg-green-50 p-5 border border-green-200 dark:bg-green-950/30 dark:border-green-800 text-green-900 dark:text-green-300 h-full flex flex-col justify-center">
                    <p className="text-sm md:text-base font-bold flex flex-wrap items-center gap-1.5">
                      Pow. obliczeniowa (<Tooltip text="AKS-O = A + B + C + D — suma biegów, spoczników, otworów i duszy. Podstawa do obliczenia Acz i strumieni.">A<sub>KS-O</sub></Tooltip>) =
                      <span className="whitespace-nowrap">{toStr(akso)} m²</span>
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">A({toStr(toNum(step2Data.A))}) + B({toStr(toNum(step2Data.B))}) + C({toStr(toNum(step2Data.C))}) + D({toStr(toNum(step2Data.D))})</p>
                  </div>
                  {anyCFD && (
                    <div className="rounded-xl bg-red-50 p-5 border-2 border-red-300 dark:bg-red-950/30 dark:border-red-700 text-red-900 dark:text-red-300">
                      <p className="mb-2.5 font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                        Konieczność CFD (pkt 7.1 wytycznych):
                      </p>
                      <ul className="space-y-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                        {cfnWarnings.cfnC && <li>• Otwory przelotowe C &gt; 10% (A+B)</li>}
                        {cfnWarnings.cfnD && <li>• Dusza schodów D &gt; 25% (A+B)</li>}
                        {cfnWarnings.cfnAKS && <li>• A<sub>KS</sub> = {toStr(toNum(step2Data.AKS))} m² &gt; 40 m²</li>}
                        {extraCFD.zlIVHighAuto && <li>• ZL IV W — klatka pionowej ewakuacji (warunek bezwzgl.)</li>}
                        {extraCFD.corrLength && <li>• Korytarz połączony z klatką &gt; 10 m</li>}
                        {extraCFD.doorDist && <li>• Odległość drzwi od granicy A<sub>KS</sub> &gt; 5 m</li>}
                        {extraCFD.corrWidth && <li>• Szerokość korytarza wspólnego &gt; 3 m</li>}
                        {extraCFD.highNoSeparation && <li>• ZL IV W: korytarze nieoddzielone drzwiami</li>}
                        {cfnWarnings.cfnSerialDoors && <li>• Napływ grawitacyjny przez dwoje drzwi w szeregu (oddalone &gt;5 m)</li>}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                        <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">Potrzebujesz symulacji CFD? Skontaktuj się w celu wyceny:</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-red-700 dark:text-red-300">
                          <span><span className="font-medium">e-mail:</span>{" "}<a href="mailto:biuro@fp-solutions.pl" className="font-bold underline hover:no-underline">biuro@fp-solutions.pl</a></span>
                          <span><span className="font-medium">tel.:</span>{" "}<a href="tel:+48790782993" className="font-bold underline hover:no-underline">+48 790 782 993</a></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
              <h2 className="mb-6 text-base md:text-lg font-bold text-slate-950 dark:text-white">Krok 3: Wymagany Typ Systemu</h2>
              <div className="rounded-2xl border-2 border-primary bg-primary bg-opacity-5 p-6 md:p-8 shadow-inner">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-5 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-primary/10">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-xl text-xl font-black shrink-0 ${systemType === "GRAVITATIONAL" ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"}`}>
                    {systemType === "GRAVITATIONAL" ? "G" : "M"}
                  </span>
                  <p className="text-center md:text-left text-xl md:text-2xl font-bold text-primary dark:text-white tracking-tight">
                    {systemType === "GRAVITATIONAL" ? "Oddymianie Grawitacyjne" : "System z Nawiewem Mechanicznym"}
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-[#1E2342] p-5 md:p-6 shadow-sm border dark:border-slate-800">
                  <p className="text-sm md:text-base leading-relaxed text-slate-700 dark:text-slate-300"><strong>Uzasadnienie wg rozdz. 4 CNBOP:</strong> {getSystemJustification()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-8 animate-fade-in">
            <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
              <h2 className="mb-8 text-base md:text-lg font-bold text-slate-950 dark:text-white">Krok 4: Specyfikacja Instalacji i Nieszczelności</h2>
              
              {/* DOBÓR KLAPY */}
              <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="rounded-2xl bg-slate-50 dark:bg-[#1C213E] border border-slate-100 dark:border-slate-800 p-5 md:p-6 mt-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Dobrana klapa dymowa</h4>
                  
                  <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-5">
                    <label className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border p-3.5 transition ${step4Data.ventInputMethod === 'dimensions' ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-white"}`}>
                      <input type="radio" checked={step4Data.ventInputMethod === 'dimensions'} onChange={() => setStep4Data(p => ({...p, ventInputMethod: 'dimensions'}))} className="hidden" />
                      <span className="text-sm font-bold text-center">Wymiary i współczynnik C<sub>v</sub></span>
                    </label>
                    <label className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border p-3.5 transition ${step4Data.ventInputMethod === 'geom_cv' ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-white"}`}>
                      <input type="radio" checked={step4Data.ventInputMethod === 'geom_cv'} onChange={() => setStep4Data(p => ({...p, ventInputMethod: 'geom_cv'}))} className="hidden" />
                      <span className="text-sm font-bold text-center">Pow. geometryczna A<sub>geom</sub> i C<sub>v</sub></span>
                    </label>
                    <label className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border p-3.5 transition ${step4Data.ventInputMethod === 'acz_cv' ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-white"}`}>
                      <input type="radio" checked={step4Data.ventInputMethod === 'acz_cv'} onChange={() => setStep4Data(p => ({...p, ventInputMethod: 'acz_cv'}))} className="hidden" />
                      <span className="text-sm font-bold text-center">Pow. czynna A<sub>cz</sub> i C<sub>v</sub></span>
                    </label>
                  </div>

                  {step4Data.ventInputMethod === 'dimensions' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
                      <UnitInput label="Szerokość klapy" unit="m" value={step4Data.ventWidth} onChange={(val: string) => setStep4Data(p => ({ ...p, ventWidth: val }))} placeholder="np. 1,00" />
                      <UnitInput label="Wysokość klapy" unit="m" value={step4Data.ventHeight} onChange={(val: string) => setStep4Data(p => ({ ...p, ventHeight: val }))} placeholder="np. 1,00" />
                      <UnitInput label="Współczynnik aerodyn. C_v" unit="-" value={step4Data.cv} onChange={(val: string) => setStep4Data(p => ({ ...p, cv: val }))} placeholder="0,60" />
                      <UnitInput label="Liczba sztuk" unit="szt." value={step4Data.count} onChange={(val: string) => setStep4Data(p => ({ ...p, count: val }))} placeholder="1" />
                    </div>
                  ) : step4Data.ventInputMethod === 'geom_cv' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                      <UnitInput label="Pow. geometryczna klapy (A_geom)" unit="m²" value={step4Data.ventAgeom} onChange={(val: string) => setStep4Data(p => ({ ...p, ventAgeom: val }))} placeholder="np. 1,00" />
                      <UnitInput label="Współczynnik aerodyn. (C_v)" unit="-" value={step4Data.cv} onChange={(val: string) => setStep4Data(p => ({ ...p, cv: val }))} placeholder="0,60" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                      <UnitInput label="Pow. czynna klapy (A_cz)" unit="m²" value={step4Data.ventAcz} onChange={(val: string) => setStep4Data(p => ({ ...p, ventAcz: val }))} placeholder="np. 0,60" />
                      <UnitInput label="Współczynnik aerodyn. (C_v)" unit="-" value={step4Data.cv} onChange={(val: string) => setStep4Data(p => ({ ...p, cv: val }))} placeholder="0,60" />
                    </div>
                  )}

                  {actualVent.Acz > 0 && (
                     <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-blue-800 text-xs font-semibold dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
                        Dobrana klapa: pow. czynna A<sub>cz</sub> = {toStr(actualVent.Acz)} m² | pow. geometryczna A<sub>geom</sub> = {toStr(actualVent.Ageom)} m²
                     </div>
                  )}
                </div>
              </div>

              {systemType === "GRAVITATIONAL" ? (
                <div className="space-y-6">
                  {/* NAPOWIETRZANIE */}
                  <div className="rounded-2xl bg-slate-50 dark:bg-[#1C213E] border border-slate-100 dark:border-slate-800 p-5 md:p-6">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Urządzenia do napowietrzania (Kompensacja)</h4>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mb-5">
                      <label className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border p-3.5 transition ${step4Data.compInputMethod === 'known_acz' ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-white"}`}>
                        <input type="radio" checked={step4Data.compInputMethod === 'known_acz'} onChange={() => setStep4Data(p => ({...p, compInputMethod: 'known_acz'}))} className="hidden" />
                        <span className="text-sm font-bold">Znam pow. czynną napowietrzania (A<sub>cz_komp</sub>)</span>
                      </label>
                      <label className={`flex-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border p-3.5 transition ${step4Data.compInputMethod === 'calculate' ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-white"}`}>
                        <input type="radio" checked={step4Data.compInputMethod === 'calculate'} onChange={() => setStep4Data(p => ({...p, compInputMethod: 'calculate'}))} className="hidden" />
                        <span className="text-sm font-bold">Oblicz z pow. geometrycznej (A<sub>geom_komp</sub>)</span>
                      </label>
                    </div>

                    {step4Data.compInputMethod === 'known_acz' ? (
                      <div className="animate-fade-in">
                        <UnitInput label="Pow. czynna otworów napowietrzających (A_cz_komp)" unit="m²" value={step4Data.compAcz} onChange={(val: string) => setStep4Data(p => ({ ...p, compAcz: val }))} placeholder="np. 1,20" />
                        <p className="text-xs text-slate-500 mt-2">Musi być spełniony warunek: A<sub>cz_komp</sub> ≥ A<sub>cz</sub> klapy dymowej.</p>
                      </div>
                    ) : (
                      <div className="space-y-5 animate-fade-in">
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Określ konfigurację drzwi/otworów. Jeśli korzystasz z drzwi otwieranych pod kątem min. 90°, program wymaga A_geom_komp ≥ 1,3 × A_odd_geom.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <button onClick={() => handleDoorConfigChange('single')} className={`p-3 text-sm font-bold border rounded-lg transition ${step4Data.doorConfiguration === 'single' ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-600 dark:text-slate-400"}`}>Pojedyncze drzwi</button>
                          <button onClick={() => handleDoorConfigChange('double')} className={`p-3 text-sm font-bold border rounded-lg transition ${step4Data.doorConfiguration === 'double' ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-600 dark:text-slate-400"}`}>Dwuskrzydłowe</button>
                          <button onClick={() => handleDoorConfigChange('two_independent')} className={`p-3 text-sm font-bold border rounded-lg transition ${step4Data.doorConfiguration === 'two_independent' ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-600 dark:text-slate-400"}`}>Dwa niezależne wyjścia</button>
                          <button onClick={() => handleDoorConfigChange('serial')} className={`p-3 text-sm font-bold border rounded-lg transition ${step4Data.doorConfiguration === 'serial' ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-600 dark:text-slate-400"}`}>Drzwi w szeregu</button>
                          <button onClick={() => handleDoorConfigChange('other')} className={`p-3 text-sm font-bold border rounded-lg transition ${step4Data.doorConfiguration === 'other' ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-600 dark:text-slate-400"}`}>Inne (okna, żaluzje)</button>
                        </div>

                        {step4Data.doorConfiguration === 'serial' && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-950/30 dark:border-amber-800">
                             <UnitInput label="Odległość między drzwiami w szeregu" unit="m" value={step4Data.serialDistance} onChange={(val: string) => setStep4Data(p => ({ ...p, serialDistance: val }))} placeholder="np. 3,50" />
                             {toNum(step4Data.serialDistance) > 5 && (
                               <p className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1"><AlertTriangleIcon className="w-4 h-4"/> Dystans &gt; 5m wymusza weryfikację CFD! (rozdz. 7.1)</p>
                             )}
                             <p className="text-xs text-amber-800 dark:text-amber-400 mt-2 font-medium">Przepustowość układu wyznacza najmniejszy z otworów (nie są one sumowane).</p>
                          </div>
                        )}

                        {step4Data.doorConfiguration !== 'other' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {step4Data.doorLeaves.map((d, index) => (
                              <div key={d.id} className="p-4 border border-slate-100 rounded-xl bg-white dark:bg-dark">
                                 <h5 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Skrzydło {index + 1}</h5>
                                 <div className="space-y-3">
                                   <UnitInput label="Szerokość otworu" unit="m" value={d.w} onChange={(val: string) => handleDoorLeafChange(d.id, 'w', val)} placeholder="0,90" />
                                   <UnitInput label="Wysokość otworu" unit="m" value={d.h} onChange={(val: string) => handleDoorLeafChange(d.id, 'h', val)} placeholder="2,00" />
                                 </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 border border-slate-100 rounded-xl bg-white dark:bg-dark">
                             <UnitInput label="Całkowita pow. geometryczna otworów" unit="m²" value={step4Data.otherCompArea} onChange={(val: string) => setStep4Data(p => ({ ...p, otherCompArea: val }))} placeholder="np. 2,00" />
                          </div>
                        )}
                        
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 md:space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Efektywna pow. nieszczelności (<Tooltip text="Suma nieszczelności przegród klatki.">A<sub>e</sub></Tooltip>)</label>
                        <button onClick={() => setAeHelper(prev => ({ ...prev, enabled: !prev.enabled }))} className="text-[10px] font-bold bg-slate-100 text-slate-700 py-2 px-3 rounded-lg dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition-colors self-start sm:self-auto">{aeHelper.enabled ? "Zamknij Asystenta" : "Otwórz Asystenta Ae"}</button>
                      </div>
                      <UnitInput value={step4Data.Ae} onChange={(val: string) => setStep4Data(p => ({ ...p, Ae: val }))} disabled={aeHelper.enabled} unit="m²" placeholder="0,00" className="disabled:opacity-60" required />
                    </div>
                    {!step1Data.selfClosers && (
                      <div className="rounded-2xl bg-amber-50 p-5 md:p-6 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 flex flex-col justify-center">
                        <UnitInput label="Pow. największego otwartego skrzydła (A_drzwi)" unit="m²" value={step4Data.openDoorArea} onChange={(val: string) => setStep4Data(p => ({ ...p, openDoorArea: val }))} placeholder="np. 1,80" required />
                      </div>
                    )}
                  </div>

                  {aeHelper.enabled && (
                    <div className="rounded-2xl bg-slate-50 p-5 md:p-8 border border-slate-100 dark:bg-[#1C213E] dark:border-slate-800 animate-fade-in shadow-inner">
                      <h4 className="font-bold text-base md:text-lg text-slate-900 dark:text-white mb-6 md:mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">Asystent obliczania pow. nieszczelności</h4>
                      <div className="space-y-8 md:space-y-10">
                        <div>
                          <h5 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 bg-slate-200/50 dark:bg-slate-800/50 inline-block px-3 py-1.5 rounded">1. Zamknięte drzwi</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                            <UnitInput label="1-skrz. do wewnątrz" unit="szt." value={aeHelper.doorsIn} onChange={(val: string) => setAeHelper(p => ({ ...p, doorsIn: val }))} className="text-sm py-2 px-3" />
                            <UnitInput label="1-skrz. na zewnątrz" unit="szt." value={aeHelper.doorsOut} onChange={(val: string) => setAeHelper(p => ({ ...p, doorsOut: val }))} className="text-sm py-2 px-3" />
                            <UnitInput label="Dwuskrzydłowe" unit="szt." value={aeHelper.doorsDouble} onChange={(val: string) => setAeHelper(p => ({ ...p, doorsDouble: val }))} className="text-sm py-2 px-3" />
                            <UnitInput label="Drzwi windy" unit="szt." value={aeHelper.doorsElevator} onChange={(val: string) => setAeHelper(p => ({ ...p, doorsElevator: val }))} className="text-sm py-2 px-3" />
                          </div>
                        </div>

                        <div>
                          <h5 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 bg-slate-200/50 dark:bg-slate-800/50 inline-block px-3 py-1.5 rounded">2. Zamknięte okna</h5>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                            <UnitInput label="Długość szczelin (obwód)" unit="m" value={aeHelper.windowLength} onChange={(val: string) => setAeHelper(p => ({ ...p, windowLength: val }))} className="text-sm py-2 px-3" />
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Szczelność okien</label>
                              <select value={aeHelper.windowType} onChange={(e) => setAeHelper(p => ({ ...p, windowType: e.target.value as any }))} className="w-full text-sm rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-[#1E2342] outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                                <option value="sealed">Rozwierane z uszczelką</option>
                                <option value="unsealed">Rozwierane bez uszczelki</option>
                                <option value="sliding">Przesuwne</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 bg-slate-200/50 dark:bg-slate-800/50 inline-block px-3 py-1.5 rounded">3. Ściany i stropy</h5>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6 md:gap-y-8">
                            <div className="bg-white dark:bg-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <UnitInput label="Ściany zewnętrzne" unit="m²" value={aeHelper.wallExtArea} onChange={(val: string) => setAeHelper(p => ({ ...p, wallExtArea: val }))} className="text-sm py-2 px-3 mb-2" />
                              <select value={aeHelper.wallExtTightness} onChange={(e) => setAeHelper(p => ({ ...p, wallExtTightness: e.target.value as any }))} className="w-full text-xs rounded border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-[#1E2342] outline-none">
                                <option value="tight">Szczelna (7,0×10⁻⁵ m²/m²)</option>
                                <option value="average">Przeciętna (2,1×10⁻³ m²/m²)</option>
                                <option value="leaky">Nieszczelna (4,2×10⁻³ m²/m²)</option>
                                <option value="very_leaky">B. nieszczelna (1,3×10⁻² m²/m²)</option>
                              </select>
                            </div>
                            <div className="bg-white dark:bg-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <UnitInput label="Ściany wewnętrzne" unit="m²" value={aeHelper.wallIntArea} onChange={(val: string) => setAeHelper(p => ({ ...p, wallIntArea: val }))} className="text-sm py-2 px-3 mb-2" />
                              <select value={aeHelper.wallIntTightness} onChange={(e) => setAeHelper(p => ({ ...p, wallIntTightness: e.target.value as any }))} className="w-full text-xs rounded border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-[#1E2342] outline-none">
                                <option value="tight">Szczelna (1,4×10⁻⁵ m²/m²)</option>
                                <option value="average">Przeciętna (1,1×10⁻³ m²/m²)</option>
                                <option value="leaky">Nieszczelna (3,5×10⁻³ m²/m²)</option>
                              </select>
                            </div>
                            <div className="bg-white dark:bg-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <UnitInput label="Szyby windowe" unit="m²" value={aeHelper.wallElevArea} onChange={(val: string) => setAeHelper(p => ({ ...p, wallElevArea: val }))} className="text-sm py-2 px-3 mb-2" />
                              <select value={aeHelper.wallElevTightness} onChange={(e) => setAeHelper(p => ({ ...p, wallElevTightness: e.target.value as any }))} className="w-full text-xs rounded border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-[#1E2342] outline-none">
                                <option value="tight">Szczelna (1,8×10⁻³ m²/m²)</option>
                                <option value="average">Przeciętna (8,4×10⁻³ m²/m²)</option>
                                <option value="leaky">Nieszczelna (1,8×10⁻² m²/m²)</option>
                              </select>
                            </div>
                            <div className="bg-white dark:bg-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                              <UnitInput label="Strop najwyższej kond." unit="m²" value={aeHelper.ceilingArea} onChange={(val: string) => setAeHelper(p => ({ ...p, ceilingArea: val }))} className="text-sm py-2 px-3" />
                            </div>
                          </div>
                        </div>
                        <div className="pt-2">
                          <UnitInput label="Inne nieszczelności i kratki transferowe" unit="m²" value={aeHelper.otherAe} onChange={(val: string) => setAeHelper(p => ({ ...p, otherAe: val }))} className="text-sm py-2 px-3 lg:w-1/2" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 dark:bg-dark dark:border-slate-800">
                    <h4 className="font-bold text-base md:text-lg text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Wyrzut i spręż wentylatora (<Tooltip text="Określa opory trasy hydraulicznej.">ΔP Sieci</Tooltip>)</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Typ instalacji tłocznej</label>
                        <select value={step4Data.installationType} onChange={(e) => setStep4Data(p => ({ ...p, installationType: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none dark:border-slate-700 dark:bg-[#1E2342]">
                          <option value="wall">Wyrzut Ścienny (Bezpośredni, 0 Pa)</option>
                          <option value="ducted">Wyrzut Kanałowy (Wymaga obliczenia strat)</option>
                        </select>
                      </div>
                      <div>
                        <UnitInput label="Opory i straty tłoczne kanału" unit="Pa" disabled={step4Data.installationType === 'wall'} value={step4Data.ductPressureLoss} onChange={(val: string) => setStep4Data(p => ({ ...p, ductPressureLoss: val }))} placeholder="0" className="disabled:bg-slate-50 dark:disabled:bg-[#1C213E]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step === 5 && results && (
           <div className="space-y-10 animate-fade-in">
             <div id="cnbop-results" className="rounded-2xl bg-white p-6 md:p-10 shadow-md border border-slate-100 dark:bg-dark dark:border-slate-800">
                <h2 className="mb-8 md:mb-10 text-xl md:text-2xl font-bold text-slate-950 dark:text-white tracking-tight border-b border-slate-100 dark:border-slate-800 pb-6 md:pb-8">Zestawienie Końcowe</h2>
                
                {/* Zestawienie wprowadzonych danych */}
                <div className="mb-10 md:mb-12 rounded-2xl bg-slate-50 dark:bg-[#1C213E] p-6 md:p-8 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3">Podsumowanie wprowadzonych założeń</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
                    <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Budynek</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-2.5">Kategoria <strong className="text-primary">{categories.find(c => c.value === step1Data.categoryZL)?.label.split(" (")[0]}</strong></p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-1">Klasa wys. <strong className="text-primary">{({ N: "N — niski", SW: "SW — średniowysoki", W: "W — wysoki", WW: "WW — wysokościowy" } as Record<string,string>)[step1Data.buildingHeightGroup]}</strong></p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-1"><strong className="text-primary">{step1Data.numberOfFloorsTotal}</strong> kond. ({step1Data.numberOfFloorsAbove} nadz. + {step1Data.numberOfFloorsBelow} podz.)</p>
                    </div>
                    <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Zabezpieczenia</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-2.5">Obudowa EI 30: <strong className={step1Data.stairwellEnclosure === 'ppoż' ? "text-green-600" : "text-red-500"}>{step1Data.stairwellEnclosure === 'ppoż' ? "Tak" : "Nie"}</strong></p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-1">Samozamykacze: <strong className={step1Data.selfClosers ? "text-green-600" : "text-red-500"}>{step1Data.selfClosers ? "Tak" : "Nie"}</strong></p>
                    </div>
                    <div className="border-l-2 border-primary/30 dark:border-primary/50 pl-4 sm:col-span-2 lg:col-span-2">
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-primary/80">Powierzchnia obliczeniowa klatki</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-2.5">A<sub>KS</sub> = <strong className="text-primary whitespace-nowrap">{toStr(toNum(step2Data.AKS))} m²</strong></p>
                      <p className="text-base font-bold text-slate-900 dark:text-white mt-1">A<sub>KS-O</sub> = <strong className="text-primary whitespace-nowrap">{toStr(results.AKS_O)} m²</strong></p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {([["A", "biegi", step2Data.A], ["B", "spoczniki", step2Data.B], ["C", "otwory", step2Data.C], ["D", "dusza", step2Data.D]] as [string, string, string][]).map(([sym, label, val]) => (
                          <div key={sym} className="flex flex-col">
                            <span className="font-bold text-slate-400">{sym}</span>
                            <span>{label}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{toStr(toNum(val))} m²</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wyniki obliczeń */}
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Zalecane rozwiązanie wykonawcze (wg CNBOP)</p>
                <p className="text-xl md:text-2xl font-bold text-primary dark:text-white uppercase tracking-tight mb-8">
                  {results.systemType === "GRAVITATIONAL" ? "Oddymianie Grawitacyjne" : "System z Nawiewem Mechanicznym"}
                </p>

                {/* Wspólna informacja o klapie dymowej */}
                <h3 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">Wymagania dla klapy dymowej</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 mb-10">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:bg-[#1C213E] dark:border-slate-800 flex flex-col justify-center">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Wymagane minimum (A<sub>cz, min</sub>)</p>
                    <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight whitespace-nowrap">{toStr(results.outputs.Acz || 0)} <span className="text-base font-bold">m²</span></p>
                  </div>
                  <div className={`rounded-2xl border p-6 flex flex-col justify-center ${actualVent.Acz >= (results.outputs.Acz || 0) ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700" : "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700"}`}>
                    <p className="text-sm font-semibold mb-2">Zadeklarowana klapa (A<sub>cz, rz.</sub>)</p>
                    <p className={`text-xl md:text-2xl font-black tracking-tight whitespace-nowrap ${actualVent.Acz >= (results.outputs.Acz || 0) ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      {toStr(actualVent.Acz)} <span className="text-base font-bold">m²</span>
                    </p>
                    <p className={`text-xs mt-1 font-bold ${actualVent.Acz >= (results.outputs.Acz || 0) ? "text-green-600" : "text-red-600"}`}>
                      {actualVent.Acz >= (results.outputs.Acz || 0) ? "✓ Spełnia wymogi" : "✗ Nie spełnia wymogów"}
                    </p>
                  </div>
                </div>

                {results.systemType === "GRAVITATIONAL" && (
                  <>
                    <h3 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">Wymagania dla napowietrzania</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 mb-10">
                      {step4Data.compInputMethod === 'calculate' ? (
                        <>
                           <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:bg-[#1C213E] dark:border-slate-800 flex flex-col justify-center sm:col-span-2">
                             <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                               Wymagana powierzchnia {step4Data.doorConfiguration === 'other' ? "efektywna (A_komp_ef)" : "geometryczna (A_komp_geom)"}
                             </p>
                             <p className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight whitespace-nowrap">
                               {toStr(results.outputs.Akomp_geom || results.outputs.Akomp_eff || 0)} <span className="text-base font-bold">m²</span>
                             </p>
                           </div>
                           <div className={`rounded-2xl border p-6 flex flex-col justify-center sm:col-span-2 ${compCalc.providedAgeom >= (results.outputs.Akomp_geom || results.outputs.Akomp_eff || 0) ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700" : "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700"}`}>
                             <p className="text-sm font-semibold mb-2">Zadeklarowane otwory (pow. {step4Data.doorConfiguration === 'serial' ? "najwęższego gardła" : "całkowita"})</p>
                             <p className={`text-xl md:text-2xl font-black tracking-tight whitespace-nowrap ${compCalc.providedAgeom >= (results.outputs.Akomp_geom || results.outputs.Akomp_eff || 0) ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                               {toStr(compCalc.providedAgeom)} <span className="text-base font-bold">m²</span>
                             </p>
                             <p className={`text-xs mt-1 font-bold ${compCalc.providedAgeom >= (results.outputs.Akomp_geom || results.outputs.Akomp_eff || 0) ? "text-green-600" : "text-red-600"}`}>
                               {compCalc.providedAgeom >= (results.outputs.Akomp_geom || results.outputs.Akomp_eff || 0) ? "✓ Otwory spełniają wymóg" : "✗ Otwory są za małe"}
                             </p>
                           </div>
                        </>
                      ) : (
                        <div className={`rounded-2xl border p-6 flex flex-col justify-center sm:col-span-2 ${compCalc.providedAcz >= actualVent.Acz ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700" : "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700"}`}>
                           <p className="text-sm font-semibold mb-2">A<sub>cz</sub> otworów kompensacyjnych względem klapy (A<sub>cz, komp</sub> ≥ A<sub>cz, klapy</sub>)</p>
                           <p className={`text-xl md:text-2xl font-black tracking-tight whitespace-nowrap ${compCalc.providedAcz >= actualVent.Acz ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                             {toStr(compCalc.providedAcz)} <span className="text-base font-bold text-slate-500">vs</span> {toStr(actualVent.Acz)} <span className="text-base font-bold">m²</span>
                           </p>
                           <p className={`text-xs mt-1 font-bold ${compCalc.providedAcz >= actualVent.Acz ? "text-green-600" : "text-red-600"}`}>
                             {compCalc.providedAcz >= actualVent.Acz ? "✓ Spełnia warunek" : "✗ Zbyt mała pow. czynna kompensacji"}
                           </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {results.systemType === "MECHANICAL" && (
                  <div className="space-y-6 md:space-y-8">
                    <h3 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Karta Osiągów: Strumienie i Wentylator</h3>
                    
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm dark:bg-dark dark:border-slate-800 overflow-x-auto">
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
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Obliczeniowy strumień powietrza nawiewanego (V<sub>n_max</sub>)</p>
                        <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight whitespace-nowrap">{results.outputs.vn_max} <span className="text-base font-bold">m³/h</span></p>
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

             {/* Podsumowanie CFD */}
             {anyCFD && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 md:p-8 shadow-sm dark:bg-red-950/20 dark:border-red-800/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5 pb-5 border-b border-red-200 dark:border-red-800/50">
                  <span className="flex items-center justify-center rounded-xl bg-red-100 text-red-600 p-3 shrink-0"><AlertTriangleIcon className="w-6 h-6"/></span>
                  <h3 className="text-base md:text-lg font-black text-red-800 dark:text-red-400 uppercase tracking-tight">Konieczna weryfikacja CFD</h3>
                </div>
                <p className="mb-5 text-sm font-medium text-red-900/80 dark:text-red-300/90 leading-relaxed max-w-4xl">Warunki stosowania metody obliczeniowej nie są w pełni spełnione. Skuteczność systemu należy potwierdzić symulacją CFD z uwagi na poniższe punkty (rozdz. 7.1 wytycznych):</p>
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
           </div>
        )}

        {/* BOTTOM NAVIGATION */}
        <div className="mt-12 flex flex-col sm:flex-row flex-wrap gap-5 justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-8 md:pt-10">
          <button onClick={handleBackStep} disabled={step === 1} className="flex w-full sm:w-auto justify-center items-center rounded-xl border border-slate-200 px-6 md:px-8 py-3.5 text-sm md:text-base font-bold text-slate-600 transition hover:bg-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            ← Wstecz
          </button>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 w-full sm:w-auto justify-end">
            {step < 4 && <button onClick={handleNextStep} className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-primary px-8 md:px-10 py-3.5 text-sm md:text-base font-bold text-white transition hover:bg-opacity-90 shadow-sm gap-2">Dalej →</button>}
            {step === 4 && <button onClick={handleSubmit} className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-green-500 px-8 md:px-10 py-3.5 text-sm md:text-base font-bold text-white transition hover:bg-green-600 shadow-sm gap-2">Oblicz Wyniki →</button>}
            {step === 5 && (
              <>
                <div ref={downloadMenuRef} className="relative w-full sm:w-auto">
                  <button
                    onClick={() => setDownloadMenuOpen(o => !o)}
                    className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 gap-2.5 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>Pobierz raport</span>
                    <svg className={`w-4 h-4 shrink-0 transition-transform duration-200 ${downloadMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {downloadMenuOpen && (
                    <div className="absolute bottom-full mb-3 right-0 w-64 rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Wybierz format</p>
                      </div>

                      <button
                        onClick={() => { handleDownloadPDF(); setDownloadMenuOpen(false); }}
                        className="group flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors dark:bg-red-900/30 dark:text-red-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </span>
                        <span className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Raport PDF</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">Gotowy do druku i archiwizacji</span>
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">.pdf</span>
                      </button>

                      <div className="mx-4 border-t border-slate-100 dark:border-slate-800" />

                      <button
                        onClick={() => { handleDownloadXLSX(); setDownloadMenuOpen(false); }}
                        className="group flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors dark:bg-green-900/30 dark:text-green-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" /></svg>
                        </span>
                        <span className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Arkusz Excel</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">Dane do dalszej edycji</span>
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">.xlsx</span>
                      </button>

                      <div className="mx-4 border-t border-slate-100 dark:border-slate-800" />

                      <button
                        onClick={() => { handleDownloadDOCX(); setDownloadMenuOpen(false); }}
                        className="group flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors dark:bg-blue-900/30 dark:text-blue-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </span>
                        <span className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dokument Word</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">Edytowalny raport tekstowy</span>
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">.docx</span>
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => { setStep(1); setHasCalculated(false); scrollToTabs(); }} className="flex w-full sm:w-auto justify-center items-center rounded-xl bg-slate-800 text-white px-5 py-3.5 text-sm font-bold transition hover:bg-slate-900 shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600">
                  Nowe Obliczenie
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}