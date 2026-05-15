"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Step1Data,
  determineSystemType,
  classifyBuildingHeight,
  calculateStaircaseAreas,
  calculateCFDWarnings,
  calculateGravitational,
  calculateMechanical,
  validateStep2,
  CalculationResults,
} from "@/lib/calculations/cnbop";

// --- KOMPONENT POMOCNICZY: TOOLTIP Z OBJAŚNIENIAMI ---
const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <div className="group relative inline-flex cursor-help items-center">
    <span className="border-b border-dashed border-primary dark:border-gray-400">{children}</span>
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-xs sm:max-w-sm -translate-x-1/2 whitespace-normal rounded bg-gray-900 px-3 py-3 text-left text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
      {text}
      <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
    </div>
  </div>
);

const toNum = (val: string | number): number => {
  if (val === "" || val === null || val === undefined) return 0;
  const parsed = Number(String(val).replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
};

const categories = [
  { value: "ZL_I", label: "ZL I" },
  { value: "ZL_II", label: "ZL II" },
  { value: "ZL_III", label: "ZL III" },
  { value: "ZL_IV", label: "ZL IV (Mieszkalne)" },
  { value: "ZL_V", label: "ZL V" },
  { value: "PM", label: "PM" },
];

const enclosures = [
  { value: "ppoż", label: "Obudowana drzwiami przeciwpożarowymi" },
  { value: "non-ppoż", label: "Nieobudowana lub drzwi bez odporności PPOŻ" },
];

const compensationTypes = [
  { value: "doors_90", label: "Drzwi otwierane na min. 90 stopni" },
  { value: "other", label: "Inne urządzenie (okno, żaluzja)" },
];

export default function CNBOPWizardPage() {
  const [step, setStep] = useState(1);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [step2Errors, setStep2Errors] = useState<string[]>([]);

  const [step1Data, setStep1Data] = useState<Step1Data>({
    categoryZL: "ZL_IV",
    buildingHeightType: "floors",
    buildingHeightValue: 0,
    buildingHeightGroup: "N",
    buildingTypeWT: "standard",
    numberOfFloors: 1,
    expandsEvacuation: false,
    stairwellEnclosure: "ppoż",
    selfClosers: true,
  });

  const [step2aData, setStep2aData] = useState({
    calculationMode: "auto" as "auto" | "manual",
    flights: [{ id: Date.now(), width: "1.2", length: "2.5" }],
    landings: [{ id: Date.now() + 1, width: "1.5", depth: "1.5" }],
    openings: [] as { id: number; area: string }[],
    cores: [] as { id: number; area: string }[],
  });

  const [step2Data, setStep2Data] = useState({
    AKS: "0",
    A: "0",
    B: "0",
    C: "0",
    D: "0",
  });

  const [step4Data, setStep4Data] = useState({
    compensationType: "doors_90",
    Ae: "0",
    openDoorArea: "0",
    installationType: "wall",
    ductPressureLoss: "0",
  });

  // --- ZAAWANSOWANY ASYSTENT NIESZCZELNOŚCI (ZAŁĄCZNIK 2 CNBOP) ---
  const [aeHelper, setAeHelper] = useState({
    enabled: false,
    // Drzwi (Tabela 3)
    doorsIn: "0",
    doorsOut: "0",
    doorsDouble: "0",
    doorsElevator: "0",
    // Okna (Tabela 4) - wartość to obwód (długość szczeliny w m)
    windowLength: "0",
    windowType: "sealed" as "unsealed" | "sealed" | "sliding",
    // Ściany (Tabela 1) - wartość to powierzchnia w m2
    wallExtArea: "0",
    wallExtTightness: "average" as "tight" | "average" | "leaky" | "very_leaky",
    wallIntArea: "0",
    wallIntTightness: "average" as "tight" | "average" | "leaky",
    wallElevArea: "0",
    wallElevTightness: "average" as "tight" | "average" | "leaky",
    // Stropy (Tabela 2)
    ceilingArea: "0",
    // Inne
    otherAe: "0"
  });

  const systemType = useMemo(() => determineSystemType(step1Data), [step1Data]);

  const getMinDimensions = (type: string) => {
    if (type === 'healthcare') return { x: 1.4, y: 1.5 };
    if (type === 'garage') return { x: 0.9, y: 0.9 };
    return { x: 1.2, y: 1.5 };
  };
  const minDims = getMinDimensions(step1Data.buildingTypeWT);

  const parsedStep2a = useMemo(() => ({
    calculationMode: step2aData.calculationMode,
    flights: step2aData.flights.map((f) => ({ width: toNum(f.width), length: toNum(f.length) })),
    landings: step2aData.landings.map((l) => ({ width: toNum(l.width), depth: toNum(l.depth) })),
    openings: step2aData.openings.map((o) => ({ area: toNum(o.area) })),
    cores: step2aData.cores.map((c) => ({ area: toNum(c.area) })),
  }), [step2aData]);

  const parsedStep2 = useMemo(() => ({
    AKS: toNum(step2Data.AKS),
    A: toNum(step2Data.A),
    B: toNum(step2Data.B),
    C: toNum(step2Data.C),
    D: toNum(step2Data.D),
  }), [step2Data]);

  const parsedStep4 = useMemo(() => ({
    compensationType: step4Data.compensationType as "doors_90" | "other",
    Ae: toNum(step4Data.Ae),
    openDoorArea: toNum(step4Data.openDoorArea),
    installationType: step4Data.installationType as "wall" | "ducted",
    ductPressureLoss: toNum(step4Data.ductPressureLoss),
  }), [step4Data]);

  const calculatedAreas = useMemo(() => {
    if (parsedStep2a.calculationMode === "auto") {
      return calculateStaircaseAreas(parsedStep2a);
    }
    return null;
  }, [parsedStep2a]);

  useEffect(() => {
    if (calculatedAreas) {
      setStep2Data({
        AKS: String(calculatedAreas.AKS),
        A: String(calculatedAreas.A),
        B: String(calculatedAreas.B),
        C: String(calculatedAreas.C),
        D: String(calculatedAreas.D),
      });
    }
  }, [calculatedAreas]);

  // Efekt liczący powierzchnię Ae na podstawie norm i wytycznych CNBOP (Zał. 2)
  useEffect(() => {
    if (aeHelper.enabled) {
      // 1. Drzwi (m2 / sztukę)
      const dIn = toNum(aeHelper.doorsIn) * 0.01;
      const dOut = toNum(aeHelper.doorsOut) * 0.02;
      const dDouble = toNum(aeHelper.doorsDouble) * 0.03;
      const dElev = toNum(aeHelper.doorsElevator) * 0.06;

      // 2. Okna (długość szczeliny * współczynnik)
      const wFactors = { unsealed: 0.00025, sealed: 0.000036, sliding: 0.0001 };
      const wArea = toNum(aeHelper.windowLength) * wFactors[aeHelper.windowType];

      // 3. Ściany zewnętrzne (powierzchnia * współczynnik)
      const extFactors = { tight: 0.00007, average: 0.00021, leaky: 0.00042, very_leaky: 0.0013 };
      const extArea = toNum(aeHelper.wallExtArea) * extFactors[aeHelper.wallExtTightness];

      // 4. Ściany wewnętrzne (powierzchnia * współczynnik)
      const intFactors = { tight: 0.000014, average: 0.00011, leaky: 0.00035 };
      const intArea = toNum(aeHelper.wallIntArea) * intFactors[aeHelper.wallIntTightness];

      // 5. Ściany szybów windowych (powierzchnia * współczynnik)
      const elevFactors = { tight: 0.00018, average: 0.00084, leaky: 0.0018 };
      const elevArea = toNum(aeHelper.wallElevArea) * elevFactors[aeHelper.wallElevTightness];

      // 6. Stropy (zawsze 0.52 * 10^-4)
      const ceilArea = toNum(aeHelper.ceilingArea) * 0.000052;

      // Suma całkowita
      const calcAe = dIn + dOut + dDouble + dElev + wArea + extArea + intArea + elevArea + ceilArea + toNum(aeHelper.otherAe);
      
      setStep4Data(prev => ({ ...prev, Ae: String(calcAe.toFixed(4)) }));
    }
  }, [aeHelper]);

  const akso = useMemo(() => parsedStep2.A + parsedStep2.B + parsedStep2.C + parsedStep2.D, [parsedStep2]);
  const abSum = useMemo(() => parsedStep2.A + parsedStep2.B, [parsedStep2]);
  
  const step2Validation = useMemo(() => validateStep2(parsedStep2, parsedStep2a, minDims.x, minDims.y), [parsedStep2, parsedStep2a, minDims.x, minDims.y]);
  const cfnWarnings = useMemo(
    () =>
      step2Validation.valid ? calculateCFDWarnings(parsedStep2.AKS, abSum, parsedStep2.C, parsedStep2.D) : { cfnC: false, cfnD: false, cfnAKS: false },
    [parsedStep2, step2Validation, abSum]
  );

  const results = useMemo<CalculationResults | null>(() => {
    if (!hasCalculated) return null; 
    return systemType === "GRAVITATIONAL"
      ? calculateGravitational(step1Data, parsedStep2, parsedStep4)
      : calculateMechanical(step1Data, parsedStep2, parsedStep4);
  }, [hasCalculated, systemType, step1Data, parsedStep2, parsedStep4]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleStep1Change = (key: keyof Step1Data, value: any) => {
    let newState: Partial<Step1Data> = { [key]: value };

    if (key === "categoryZL") {
      const newHeightType = value === "ZL_IV" ? "floors" : "meters";
      newState = { ...newState, buildingHeightType: newHeightType, buildingHeightValue: 0, buildingHeightGroup: "N" };
    }

    if (key === "buildingHeightValue" || key === "categoryZL" || key === "buildingHeightType") {
      const val = key === "buildingHeightValue" ? Number(value) : step1Data.buildingHeightValue;
      const cat = key === "categoryZL" ? value : step1Data.categoryZL;
      const hType = key === "buildingHeightType" ? value : step1Data.buildingHeightType;
      
      const newGroup = classifyBuildingHeight(hType, val, cat);
      newState = { ...newState, buildingHeightGroup: newGroup };
    }
    setStep1Data((prev) => ({ ...prev, ...newState }));
  };

  const addFlight = () => setStep2aData(p => ({ ...p, flights: [...p.flights, { id: Date.now(), width: "", length: "" }] }));
  const removeFlight = (id: number) => setStep2aData(p => ({ ...p, flights: p.flights.filter(f => f.id !== id) }));
  const updateFlight = (id: number, field: "width" | "length", val: string) => setStep2aData(p => ({ ...p, flights: p.flights.map(f => f.id === id ? { ...f, [field]: val.replace(/[^0-9.,]/g, "") } : f) }));

  const addLanding = () => setStep2aData(p => ({ ...p, landings: [...p.landings, { id: Date.now(), width: "", depth: "" }] }));
  const removeLanding = (id: number) => setStep2aData(p => ({ ...p, landings: p.landings.filter(l => l.id !== id) }));
  const updateLanding = (id: number, field: "width" | "depth", val: string) => setStep2aData(p => ({ ...p, landings: p.landings.map(l => l.id === id ? { ...l, [field]: val.replace(/[^0-9.,]/g, "") } : l) }));

  const addOpening = () => setStep2aData(p => ({ ...p, openings: [...p.openings, { id: Date.now(), area: "" }] }));
  const removeOpening = (id: number) => setStep2aData(p => ({ ...p, openings: p.openings.filter(o => o.id !== id) }));
  const updateOpening = (id: number, val: string) => setStep2aData(p => ({ ...p, openings: p.openings.map(o => o.id === id ? { ...o, area: val.replace(/[^0-9.,]/g, "") } : o) }));

  const addCore = () => setStep2aData(p => ({ ...p, cores: [...p.cores, { id: Date.now(), area: "" }] }));
  const removeCore = (id: number) => setStep2aData(p => ({ ...p, cores: p.cores.filter(c => c.id !== id) }));
  const updateCore = (id: number, val: string) => setStep2aData(p => ({ ...p, cores: p.cores.map(c => c.id === id ? { ...c, area: val.replace(/[^0-9.,]/g, "") } : c) }));

  const handleStep2Change = (key: string, value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, "");
    setStep2Data((prev) => ({ ...prev, [key]: cleanValue }));
  };

  const handleStep4Change = (key: string, value: string) => {
    if (key === "compensationType" || key === "installationType") {
      setStep4Data((prev) => ({ ...prev, [key]: value }));
    } else {
      const cleanValue = value.replace(/[^0-9.,]/g, "");
      setStep4Data((prev) => ({ ...prev, [key]: cleanValue }));
    }
  };

  const handleAeHelperChange = (key: string, value: string) => {
    if (key === "windowType" || key === "wallExtTightness" || key === "wallIntTightness" || key === "wallElevTightness") {
      setAeHelper((prev) => ({ ...prev, [key]: value }));
    } else {
      const cleanValue = value.replace(/[^0-9.,]/g, "");
      setAeHelper((prev) => ({ ...prev, [key]: cleanValue }));
    }
  };

  const handleTabClick = (idx: number) => {
    const targetStep = idx + 1;
    if (targetStep === step) return;

    if (step === 2 && targetStep > 2) {
      if (!step2Validation.valid) {
        setStep2Errors(step2Validation.errors);
        return; 
      }
      setStep2Errors([]);
    }

    if (targetStep === 5 && !hasCalculated) return; 

    setStep(targetStep);
    scrollToTop();
  };

  const handleNextStep = () => {
    if (step === 2) {
      if (!step2Validation.valid) {
        setStep2Errors(step2Validation.errors);
        return;
      }
      setStep2Errors([]);
    }
    if (step < 5) {
      setStep(step + 1);
      scrollToTop();
    }
  };

  const handleSubmit = () => {
    setHasCalculated(true); 
    setStep(5);
    scrollToTop();
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
      scrollToTop();
    }
  };

  const getSystemJustification = () => {
    const cat = step1Data.categoryZL;
    const h = step1Data.buildingHeightGroup;
    const expands = step1Data.expandsEvacuation;
    const enc = step1Data.stairwellEnclosure;

    if (cat === 'ZL_IV') {
      if (h === 'W' || h === 'WW') return "Zgodnie z rozdz. 4.3 wytycznych CNBOP (oraz WT), budynki mieszkalne wysokie (W) i wysokościowe (WW) wymagają skutecznego zabezpieczenia przed zadymieniem za pomocą zaawansowanego systemu z nawiewem mechanicznym ze względu na wysokie ryzyko dla dróg ewakuacji.";
      if (h === 'SW' && enc === 'non-ppoż') return "Zgodnie z rozdz. 4.2 wytycznych CNBOP, klatki schodowe w budynkach ZL IV średniowysokich, które nie są wydzielone drzwiami PPOŻ, narażone są na bezpośredni napływ dymu z mieszkań. Obligatoryjnie wymagany jest nawiew mechaniczny zapobiegający opadaniu dymu.";
      if (h === 'SW' && enc === 'ppoż') return "Zgodnie z rozdz. 4.4 wytycznych CNBOP, klatki w bud. ZL IV średniowysokich (SW), posiadające pełne wydzielenie obudową i drzwiami PPOŻ, gwarantują wystarczający poziom bezpieczeństwa, aby móc zastosować standardowe oddymianie grawitacyjne.";
      if (h === 'N') return "Rozdział 4.5. Dla budynków niskich (N) ZL IV wytyczne i normy prawne dopuszczają stosowanie standardowego oddymiania grawitacyjnego jako skutecznej i ekonomicznej ochrony klatki schodowej.";
    } else {
      if (h === 'W' || h === 'WW') return "Zgodnie z rozdz. 4.5 wytycznych CNBOP, klatki schodowe stanowiące drogi ewakuacyjne w budynkach użyteczności publicznej lub PM (wysokich i wysokościowych) wymagają bezwzględnie instalacji nawiewu mechanicznego.";
      if (h === 'SW') return "Zgodnie z rozdz. 4.5 wytycznych CNBOP, na klatkach budynków użyteczności publicznej i PM zakwalifikowanych jako Średniowysokie (SW) należy obligatoryjnie stosować system oddymiania z nawiewem mechanicznym.";
      if (h === 'N' && expands) return "Zgodnie z rozdz. 4.5 wytycznych CNBOP, jeżeli celem oddymiania ma być powiększenie dopuszczalnej długości dojścia ewakuacyjnego, to nawet w budynkach niskich (N) algorytmy wymuszają zastosowanie wydajniejszego systemu z nawiewem mechanicznym.";
      if (h === 'N' && !expands) return "Zgodnie z rozdz. 4.5, w budynkach niskich użyteczności publicznej/PM, w których system nie służy do powiększania dojść ewakuacyjnych, przepisy uznają za wystarczające wykonanie instalacji oddymiania grawitacyjnego.";
    }
    return "";
  };

  const TrashIcon = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const stepLabels = ["Parametry", "Wymiary Klatki", "Typ Systemu", "Dane Szczegółowe", "Wyniki"];

  return (
    <div className="pb-[120px] pt-[150px]">
      <div className="container mx-auto px-4">
        <Link
          href="/narzedzia/kalkulatory"
          className="mb-8 inline-flex items-center text-sm font-medium text-body-color hover:text-primary dark:text-body-color-dark"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Powrót do kalkulatorów
        </Link>

        <div className="mb-12 rounded-md bg-white p-8 shadow-two dark:bg-dark">
          <h1 className="mb-4 text-3xl font-bold text-black dark:text-white sm:text-4xl">Kalkulator CNBOP-PIB W-0003:2016</h1>
          <p className="text-base font-medium text-body-color dark:text-body-color-dark">
            Interaktywny wizard do projektowania systemów oddymiania klatek schodowych
          </p>
        </div>

        <div className="mb-12 flex gap-2 overflow-x-auto pb-4">
          {stepLabels.map((label, idx) => {
            const isCompleted = idx + 1 < step;
            const isActive = idx + 1 === step;
            const isResultsButNoResults = idx + 1 === 5 && !hasCalculated;

            return (
              <button
                key={idx}
                onClick={() => handleTabClick(idx)}
                disabled={isResultsButNoResults}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition shadow-md ${
                  isActive
                    ? "bg-primary text-white cursor-default"
                    : isResultsButNoResults
                      ? "bg-body-color bg-opacity-10 text-body-color opacity-50 cursor-not-allowed dark:bg-white dark:bg-opacity-5 dark:text-body-color-dark"
                      : isCompleted
                        ? "bg-green-500 text-white cursor-pointer hover:bg-green-600"
                        : "bg-white text-body-color cursor-pointer border border-transparent hover:bg-primary hover:text-white dark:bg-[#242B51] dark:text-white dark:hover:bg-primary"
                }`}
              >
                {idx + 1}. {label}
              </button>
            );
          })}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="rounded-md bg-white p-8 shadow-two dark:bg-dark animate-fade-in">
            <h2 className="mb-6 text-2xl font-bold text-black dark:text-white">Krok 1: Parametry Podstawowe Budynku</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    Kategoria zagrożenia ludzi (<Tooltip text="Określa przeznaczenie budynku i wynikające z niego zagrożenia wg WT. Np. ZL IV to budynki mieszkalne.">ZL</Tooltip>) <span className="text-primary">*</span>
                  </label>
                  <select
                    value={step1Data.categoryZL}
                    onChange={(e) => handleStep1Change("categoryZL", e.target.value as Step1Data["categoryZL"])}
                    className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    Rodzaj budynku wg WT § 68 (<Tooltip text="Określa minimalną dopuszczalną prawnie szerokość schodów i spoczników w budynku wg Rozporządzenia MI (Dz. U. 2022 poz. 1225). Naruszenie wymiarów będzie skutkowało alertem błędów w Kroku 2.">Wymiary</Tooltip>) <span className="text-primary">*</span>
                  </label>
                  <select
                    value={step1Data.buildingTypeWT}
                    onChange={(e) => handleStep1Change("buildingTypeWT", e.target.value as Step1Data["buildingTypeWT"])}
                    className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                  >
                    <option value="standard">Standardowe (Użyteczność publiczna, Z.zbiorowego, PM) - 1.2m / 1.5m</option>
                    <option value="healthcare">Szpitale i Opieka Zdrowotna - 1.4m / 1.5m</option>
                    <option value="garage">Garaże i obiekty do 10 osób - 0.9m / 0.9m</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    {step1Data.categoryZL === "ZL_IV" ? "Liczba kond. nadziemnych do klasyfikacji" : "Wysokość budynku [m]"} <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={step1Data.buildingHeightValue || ""}
                    onChange={(e) => handleStep1Change("buildingHeightValue", e.target.value)}
                    placeholder={step1Data.categoryZL === "ZL_IV" ? "np. 5" : "np. 15"}
                    className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    Liczba obsługiwanych kondygnacji klatki <span className="text-primary">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={step1Data.numberOfFloors || ""}
                    onChange={(e) => handleStep1Change("numberOfFloors", parseInt(e.target.value) || 0)}
                    placeholder="np. 5"
                    className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                  />
                  <p className="mt-1 text-xs text-body-color dark:text-body-color-dark">Wymagane do obliczenia sprężu wg wytycznych CNBOP (przyrost strat ciśnienia 3 Pa na kondygnację).</p>
                </div>
              </div>

              {step1Data.buildingHeightValue > 0 && (
                <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900 dark:bg-opacity-20 animate-fade-in">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    📐 Klasyfikacja wysokości budynku wg § 8 WT:{" "}
                    <span className="font-bold text-primary">
                      {step1Data.buildingHeightGroup === "N" && "Niski (N)"}
                      {step1Data.buildingHeightGroup === "SW" && "Średniowysoki (SW)"}
                      {step1Data.buildingHeightGroup === "W" && "Wysoki (W)"}
                      {step1Data.buildingHeightGroup === "WW" && "Wysokościowy (WW)"}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                  Czy system powiększa dopuszczalną długość dojścia ewakuacyjnego?
                </label>
                <div className="flex gap-6">
                  {[
                    { value: true, label: "Tak" },
                    { value: false, label: "Nie" },
                  ].map((option) => (
                    <label key={String(option.value)} className="flex cursor-pointer items-center">
                      <input
                        type="radio"
                        name="expandsEvacuation"
                        value={String(option.value)}
                        checked={step1Data.expandsEvacuation === option.value}
                        onChange={(e) => handleStep1Change("expandsEvacuation", e.target.value === "true")}
                        className="mr-2"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                  Obudowa klatki schodowej <span className="text-primary">*</span>
                </label>
                <select
                  value={step1Data.stairwellEnclosure}
                  onChange={(e) => handleStep1Change("stairwellEnclosure", e.target.value as Step1Data["stairwellEnclosure"])}
                  className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                >
                  {enclosures.map((enc) => (
                    <option key={enc.value} value={enc.value}>
                      {enc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900 dark:bg-opacity-20">
                <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                  Czy klatka spełnia aktualne wytyczne i jest w 100% wydzielona drzwiami z samozamykaczem?
                </label>
                <div className="flex gap-6">
                  {[
                    { value: true, label: "Tak" },
                    { value: false, label: "Nie" },
                  ].map((option) => (
                    <label key={String(option.value)} className="flex cursor-pointer items-center">
                      <input
                        type="radio"
                        name="selfClosers"
                        value={String(option.value)}
                        checked={step1Data.selfClosers === option.value}
                        onChange={(e) => handleStep1Change("selfClosers", e.target.value === "true")}
                        className="mr-2"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {!step1Data.selfClosers && (
                  <p className="mt-3 text-xs text-body-color dark:text-body-color-dark">
                    ⚠️ W klatkach bez wyposażenia wszystkich drzwi w samozamykacz, wymogi CNBOP W-0003:2016 narzucają wyliczanie dodatkowego strumienia strat (Kryterium II - Rozdz. 6.4.3). Otworzy to nowe opcje w Kroku 4.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="rounded-md bg-white p-8 shadow-two dark:bg-dark animate-fade-in">
            <div className="flex flex-col md:flex-row md:justify-between mb-6">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-4 md:mb-0">Krok 2: Wymiary i Powierzchnia Klatki</h2>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-body-color dark:text-body-color-dark">Tryb:</label>
                <select
                  value={step2aData.calculationMode}
                  onChange={(e) => setStep2aData({ ...step2aData, calculationMode: e.target.value as "auto" | "manual" })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-[#242B51] font-semibold"
                >
                  <option value="auto">Z wymiarów pojedynczych elementów (Auto)</option>
                  <option value="manual">Wprowadzenie sumaryczne (Manual)</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              {step2aData.calculationMode === "auto" ? (
                <div className="animate-fade-in space-y-6">
                  
                  <div className="rounded-md bg-amber-50 p-5 dark:bg-amber-900 dark:bg-opacity-20 border border-amber-100 dark:border-amber-800">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100">📏 Wymiary Biegów Schodów (Obszar A)</h3>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          <Tooltip text="Rzeczywista szerokość biegu (x) wg rys. 6.1 (CNBOP W-0003). Pole to wlicza się do wyznaczania A_KS-O, z którego oblicza się docelowy wydatek wentylatora.">
                            <strong>Parametr x</strong>
                          </Tooltip> musi spełniać minimum rygoru budowlanego (w tym trybie min: {minDims.x}m).
                        </p>
                      </div>
                      <button onClick={addFlight} type="button" className="text-xs font-bold bg-amber-200 text-amber-900 hover:bg-amber-300 py-1.5 px-3 rounded-md transition">+ Dodaj bieg</button>
                    </div>
                    
                    <div className="space-y-3">
                      {step2aData.flights.map((flight, idx) => (
                        <div key={flight.id} className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                          <span className="text-sm font-bold text-gray-500 min-w-[20px]">{idx+1}.</span>
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Szerokość (x) [min. {minDims.x}m]</label>
                            <input type="text" inputMode="decimal" value={flight.width} onChange={(e) => updateFlight(flight.id, "width", e.target.value)} 
                              className={`w-full text-sm rounded p-2 dark:bg-[#242B51] ${toNum(flight.width) > 0 && toNum(flight.width) < minDims.x ? "border-2 border-red-500" : "border-gray-200 dark:border-gray-600 border"}`} />
                          </div>
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Długość rzutu [m]</label>
                            <input type="text" inputMode="decimal" value={flight.length} onChange={(e) => updateFlight(flight.id, "length", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51] dark:border-gray-600" />
                          </div>
                          <button onClick={() => removeFlight(flight.id)} disabled={step2aData.flights.length === 1} className="text-red-500 hover:text-red-700 disabled:opacity-30 p-2"><TrashIcon /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md bg-green-50 p-5 dark:bg-green-900 dark:bg-opacity-20 border border-green-100 dark:border-green-800">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-green-900 dark:text-green-100">📏 Wymiary Spoczników (Obszar B)</h3>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                          <Tooltip text="Zgodnie z rozdz. 6.2 CNBOP, szerokość (y) spocznika liczona jest tylko na wymaganą szerokość z WT, niezależnie od tego, jak duży jest w rzeczywistości dany korytarz lub hol podłączony do klatki (stąd wymiar zredukowany A_KS-O).">
                            <strong>Parametr y</strong>
                          </Tooltip> to minimalna wymagana szerokość. W tym budynku to min: {minDims.y}m.
                        </p>
                      </div>
                      <button onClick={addLanding} type="button" className="text-xs font-bold bg-green-200 text-green-900 hover:bg-green-300 py-1.5 px-3 rounded-md transition">+ Dodaj spocznik</button>
                    </div>

                    <div className="space-y-3">
                      {step2aData.landings.map((landing, idx) => (
                        <div key={landing.id} className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                          <span className="text-sm font-bold text-gray-500 min-w-[20px]">{idx+1}.</span>
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Szer. wym. (y) [min. {minDims.y}m]</label>
                            <input type="text" inputMode="decimal" value={landing.width} onChange={(e) => updateLanding(landing.id, "width", e.target.value)} 
                              className={`w-full text-sm rounded p-2 dark:bg-[#242B51] ${toNum(landing.width) > 0 && toNum(landing.width) < minDims.y ? "border-2 border-red-500" : "border-gray-200 dark:border-gray-600 border"}`} />
                          </div>
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Głębokość z rzutu [m]</label>
                            <input type="text" inputMode="decimal" value={landing.depth} onChange={(e) => updateLanding(landing.id, "depth", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51] dark:border-gray-600" />
                          </div>
                          <button onClick={() => removeLanding(landing.id)} disabled={step2aData.landings.length === 1} className="text-red-500 hover:text-red-700 disabled:opacity-30 p-2"><TrashIcon /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-md bg-blue-50 p-5 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-100 dark:border-blue-800">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">Otwory zrzutowe (<Tooltip text="Otwory pomiędzy kondygnacjami klatki (inne niż dusza). Jeśli ich suma (C) przekroczy 10% pow. komunikacyjnej, konieczna jest symulacja CFD wg wzoru 6.4 wytycznych CNBOP.">C</Tooltip>)</h3>
                        <button onClick={addOpening} type="button" className="text-xs font-bold bg-blue-200 text-blue-900 hover:bg-blue-300 py-1 px-2 rounded">+ Dodaj</button>
                      </div>
                      {step2aData.openings.length === 0 && <p className="text-xs text-blue-600 dark:text-blue-400 italic">Brak dodatkowych otworów.</p>}
                      <div className="space-y-2">
                        {step2aData.openings.map((opening, idx) => (
                          <div key={opening.id} className="flex items-center gap-3">
                            <span className="text-xs">{idx+1}.</span>
                            <input type="text" inputMode="decimal" placeholder="Powierzchnia C w m²" value={opening.area} onChange={(e) => updateOpening(opening.id, e.target.value)} className="w-full text-sm border-gray-200 border rounded p-1.5 dark:bg-[#242B51]" />
                            <button onClick={() => removeOpening(opening.id)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md bg-purple-50 p-5 dark:bg-purple-900 dark:bg-opacity-20 border border-purple-100 dark:border-purple-800">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">Dusze schodów (<Tooltip text="Wolna, centralna przestrzeń pionowa patrząc z góry. Przekroczenie D > 25% wymusza weryfikację algorytmów analitycznych symulacjami CFD (wzór 6.5 wg W-0003:2016).">D</Tooltip>)</h3>
                        <button onClick={addCore} type="button" className="text-xs font-bold bg-purple-200 text-purple-900 hover:bg-purple-300 py-1 px-2 rounded">+ Dodaj</button>
                      </div>
                      {step2aData.cores.length === 0 && <p className="text-xs text-purple-600 dark:text-purple-400 italic">Brak duszy (schody pełne).</p>}
                      <div className="space-y-2">
                        {step2aData.cores.map((core, idx) => (
                          <div key={core.id} className="flex items-center gap-3">
                            <span className="text-xs">{idx+1}.</span>
                            <input type="text" inputMode="decimal" placeholder="Powierzchnia D w m²" value={core.area} onChange={(e) => updateCore(core.id, e.target.value)} className="w-full text-sm border-gray-200 border rounded p-1.5 dark:bg-[#242B51]" />
                            <button onClick={() => removeCore(core.id)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in space-y-6">
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900 dark:bg-opacity-20 mb-6">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      💡 Wymogi prawne z WT § 68 dla tego typu budynku:
                    </p>
                    <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                      Upewnij się, że sumaryczne pola <Tooltip text="Rzut biegów schodów. Powinny opierać się o rzeczywistą szerokość rzutu 'x'.">A</Tooltip> i <Tooltip text="Powierzchnia spoczników. Według rozdz. 6.2 CNBOP powinny opierać się wyłącznie o normową (wymaganą prawnie) szerokość 'y'.">B</Tooltip> bazują na minimalnych dopuszczalnych wymiarach dla Twojego budynku, tj. <strong>x = {minDims.x} m</strong> (szerokość biegu) oraz <strong>y = {minDims.y} m</strong> (szerokość spocznika). Użycie mniejszych gabarytów narusza standardowe przepisy budowlane.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Całkowita pow. klatki (<Tooltip text="Pełna powierzchnia architektoniczna klatki na największej kondygnacji. Używana do walidacji dopuszczalnej granicy max. 40 m² zgodnie z rozdz. 6.1 W-0003:2016.">A<sub>KS</sub></Tooltip>) [m²] <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={step2Data.AKS}
                        onChange={(e) => handleStep2Change("AKS", e.target.value)}
                        className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                      />
                    </div>
                    <div>
                      <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Suma rzutów biegów schodów (A) [m²] <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={step2Data.A}
                        onChange={(e) => handleStep2Change("A", e.target.value)}
                        className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                      />
                    </div>
                    <div>
                      <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Suma rzutów spoczników (B) [m²] <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={step2Data.B}
                        onChange={(e) => handleStep2Change("B", e.target.value)}
                        className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                      />
                    </div>
                    <div>
                      <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Otwory międzykondygnacyjne (C) [m²]
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={step2Data.C}
                        onChange={(e) => handleStep2Change("C", e.target.value)}
                        className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                      />
                    </div>
                    <div>
                      <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Dusza schodów (D) [m²]
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={step2Data.D}
                        onChange={(e) => handleStep2Change("D", e.target.value)}
                        className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step2Errors.length > 0 && (
                <div className="rounded-md border border-red-300 bg-red-50 p-4 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-200">
                  <p className="mb-2 font-semibold">Uzupełnij wymagane pola, aby przejść do algorytmów obliczeniowych:</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {step2Errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {step2Validation.valid && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-md bg-green-50 p-4 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      Zredukowana powierzchnia obliczeniowa (<Tooltip text="Całkowita zredukowana powierzchnia komunikacyjna klatki. Wzór (rozdz. 6.2 CNBOP): Suma A+B+C+D. Służy m.in. do wyznaczania przepływów strumieni minimalnych w systemach mechanicznych (0,2 m/s).">A<sub>KS-O</sub></Tooltip>) = <strong>{akso.toFixed(2)} m²</strong>
                    </p>
                  </div>

                  {(cfnWarnings.cfnC || cfnWarnings.cfnD || cfnWarnings.cfnAKS) && (
                    <div className="rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900 dark:bg-opacity-20">
                      <p className="mb-2 font-semibold text-red-700 dark:text-red-300">⚠️ Ostrzeżenia o konieczności analizy numerycznej CFD (Wytyczne CNBOP rozdz. 7.1):</p>
                      <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                        {cfnWarnings.cfnC && <li>• Otwory przelotowe (C) zajmują {parsedStep2.C} m², czyli &gt; 10% komunikacji (A+B) [wzór 6.4].</li>}
                        {cfnWarnings.cfnD && <li>• Dusza schodów (D) zajmuje {parsedStep2.D} m², czyli &gt; 25% komunikacji (A+B) [wzór 6.5].</li>}
                        {cfnWarnings.cfnAKS && <li>• Całkowita powierzchnia A<sub>KS</sub> ({parsedStep2.AKS} m²) przekracza dopuszczalny analityczny limit 40 m².</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="rounded-md bg-white p-8 shadow-two dark:bg-dark animate-fade-in">
            <h2 className="mb-6 text-2xl font-bold text-black dark:text-white">Krok 3: Wymagany Typ Systemu</h2>

            <div className="space-y-6">
              <div className="rounded-md bg-blue-50 p-6 dark:bg-blue-900 dark:bg-opacity-20">
                <p className="mb-2 text-sm font-medium text-body-color dark:text-body-color-dark">Zestawienie decyzyjne algorytmu z rozdz. 4 Wytycznych CNBOP-PIB W-0003:</p>
                <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-body-color dark:text-body-color-dark">
                  <li>Kategoria ZL: <strong>{categories.find((c) => c.value === step1Data.categoryZL)?.label}</strong></li>
                  <li>
                    Klasyfikacja obiektu:{" "}<strong>
                    {step1Data.buildingHeightGroup === "N" && "Niski (N)"}
                    {step1Data.buildingHeightGroup === "SW" && "Średniowysoki (SW)"}
                    {step1Data.buildingHeightGroup === "W" && "Wysoki (W)"}
                    {step1Data.buildingHeightGroup === "WW" && "Wysokościowy (WW)"}</strong>
                  </li>
                  <li>Infrastruktura: <strong>{enclosures.find((e) => e.value === step1Data.stairwellEnclosure)?.label}</strong></li>
                </ul>
              </div>

              <div className="rounded-md border-2 border-primary bg-primary bg-opacity-5 p-6 shadow-sm">
                <p className="text-center text-2xl font-bold text-primary dark:text-white">
                  {systemType === "GRAVITATIONAL" ? "Oddymianie Grawitacyjne" : "System z Nawiewem Mechanicznym"}
                </p>
                <p className="mt-4 text-justify text-sm text-body-color dark:text-body-color-dark bg-white dark:bg-[#242B51] p-4 rounded border border-gray-100 dark:border-gray-800">
                  {getSystemJustification()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="rounded-md bg-white p-8 shadow-two dark:bg-dark animate-fade-in">
            <h2 className="mb-6 text-2xl font-bold text-black dark:text-white">Krok 4: Dane Szczegółowe do Obliczeń</h2>

            <div className="space-y-6">
              {systemType === "GRAVITATIONAL" ? (
                <div>
                  <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                    Typ urządzenia kompensacyjnego (<Tooltip text="Otwory (drzwi/okna) w dolnej części klatki schodowej wprowadzające świeże, podmieniające powietrze dla działającej klapy.">napowietrzającego</Tooltip>) <span className="text-primary">*</span>
                  </label>
                  <div className="space-y-3">
                    {compensationTypes.map((type) => (
                      <label key={type.value} className="flex cursor-pointer items-center rounded-md border border-body-color border-opacity-20 p-4 hover:bg-body-color hover:bg-opacity-5 dark:border-white dark:border-opacity-10">
                        <input
                          type="radio"
                          name="compensationType"
                          value={type.value}
                          checked={step4Data.compensationType === type.value}
                          onChange={(e) => handleStep4Change("compensationType", e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-sm font-medium text-body-color dark:text-body-color-dark">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-dark dark:text-white">
                          Efektywna pow. nieszczelności (<Tooltip text="Suma nieszczelności wszystkich przegród wydzielających klatkę schodową (ściany, strop, zamknięte drzwi, windy) zgodnie z tabelami nr 1-4 z Załącznika 2 wytycznych. Do obliczeń wykorzystywana we wzorze (6.15).">A<sub>e</sub></Tooltip>) [m²] <span className="text-primary">*</span>
                        </label>
                        <button 
                          type="button" 
                          onClick={() => setAeHelper(prev => ({...prev, enabled: !prev.enabled}))}
                          className="text-[10px] font-bold bg-primary text-white px-2 py-1 rounded"
                        >
                          {aeHelper.enabled ? "Zamknij Asystenta" : "Użyj Asystenta (Załącznik 2)"}
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={step4Data.Ae}
                        onChange={(e) => handleStep4Change("Ae", e.target.value)}
                        disabled={aeHelper.enabled}
                        className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp disabled:opacity-50"
                      />
                    </div>

                    {!step1Data.selfClosers && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900 dark:bg-opacity-20">
                        <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                          Powierzchnia otwartych drzwi (<Tooltip text="Ponieważ zaznaczyłeś w Kroku 1, że brakuje samozamykaczy, algorytm musi dołożyć przeciek uciekający z klatki do mieszkania na kondygnacji objętej pożarem. Oznaczany jako A_drzwi (wzór 6.17 z CNBOP).">A<sub>drzwi</sub></Tooltip>) [m²]
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={step4Data.openDoorArea}
                          onChange={(e) => handleStep4Change("openDoorArea", e.target.value)}
                          className="w-full rounded-md border border-transparent px-6 py-3 text-base text-body-color shadow-one outline-none focus:border-primary dark:bg-[#242B51] dark:shadow-signUp"
                        />
                      </div>
                    )}
                  </div>

                  {/* ASYSTENT NIESZCZELNOŚCI */}
                  {aeHelper.enabled && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900 dark:bg-opacity-20 animate-fade-in shadow-sm">
                      <div className="flex items-center gap-2 mb-4 border-b border-blue-200 dark:border-blue-800 pb-2">
                        <span className="text-xl">🧮</span>
                        <div>
                          <h4 className="font-bold text-blue-900 dark:text-blue-200">Asystent obliczania pola nieszczelności</h4>
                          <p className="text-[10px] text-blue-800 dark:text-blue-300 uppercase tracking-wider font-semibold">Zgodny z Załącznikiem 2 wytycznych CNBOP W-0003:2016 [cite: 1, 2]</p>
                        </div>
                      </div>
                      
                      {/* DRZWI */}
                      <div className="mb-6">
                        <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">DRZWI ZAMKNIĘTE (Tab. 3 CNBOP)</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Drzwi 1-skrz. do wewnątrz klatki (szt.)</label>
                            <input type="text" inputMode="decimal" value={aeHelper.doorsIn} onChange={(e) => handleAeHelperChange("doorsIn", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51]" />
                            <p className="text-[10px] text-gray-500 mt-1">+0.01 m² / szt.</p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Drzwi 1-skrz. na zewnątrz klatki (szt.)</label>
                            <input type="text" inputMode="decimal" value={aeHelper.doorsOut} onChange={(e) => handleAeHelperChange("doorsOut", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51]" />
                            <p className="text-[10px] text-gray-500 mt-1">+0.02 m² / szt.</p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Drzwi dwuskrzydłowe (szt.)</label>
                            <input type="text" inputMode="decimal" value={aeHelper.doorsDouble} onChange={(e) => handleAeHelperChange("doorsDouble", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51]" />
                            <p className="text-[10px] text-gray-500 mt-1">+0.03 m² / szt.</p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Drzwi szybu windowego (szt.)</label>
                            <input type="text" inputMode="decimal" value={aeHelper.doorsElevator} onChange={(e) => handleAeHelperChange("doorsElevator", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51]" />
                            <p className="text-[10px] text-gray-500 mt-1">+0.06 m² / szt.</p>
                          </div>
                        </div>
                      </div>

                      {/* OKNA */}
                      <div className="mb-6">
                        <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">OKNA ZAMKNIĘTE (Tab. 4 CNBOP)</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Długość szczelin okien (obwód) [m]</label>
                            <input type="text" inputMode="decimal" value={aeHelper.windowLength} onChange={(e) => handleAeHelperChange("windowLength", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51]" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Rodzaj i szczelność okien</label>
                            <select value={aeHelper.windowType} onChange={(e) => handleAeHelperChange("windowType", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51]">
                              <option value="sealed">Rozwierane z uszczelką (3.6 × 10⁻⁵ m²/m)</option>
                              <option value="unsealed">Rozwierane bez uszczelki (2.5 × 10⁻⁴ m²/m)</option>
                              <option value="sliding">Przesuwne (1.0 × 10⁻⁴ m²/m)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* ŚCIANY I STROPY */}
                      <div className="mb-2">
                        <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">ŚCIANY I STROPY (Tab. 1 i 2 CNBOP)</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Pow. ścian zewnętrznych klatki [m²]</label>
                            <input type="text" inputMode="decimal" value={aeHelper.wallExtArea} onChange={(e) => handleAeHelperChange("wallExtArea", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51] mb-2" />
                            <select value={aeHelper.wallExtTightness} onChange={(e) => handleAeHelperChange("wallExtTightness", e.target.value)} className="w-full text-[11px] border-gray-200 border rounded p-1 dark:bg-[#242B51]">
                              <option value="tight">Szczelna (0.7 × 10⁻⁴ m²/m²)</option>
                              <option value="average">Przeciętna (2.1 × 10⁻⁴ m²/m²)</option>
                              <option value="leaky">Nieszczelna (4.2 × 10⁻⁴ m²/m²)</option>
                              <option value="very_leaky">Bardzo nieszczelna (1.3 × 10⁻³ m²/m²)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Pow. ścian wewnętrznych klatki [m²]</label>
                            <input type="text" inputMode="decimal" value={aeHelper.wallIntArea} onChange={(e) => handleAeHelperChange("wallIntArea", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51] mb-2" />
                            <select value={aeHelper.wallIntTightness} onChange={(e) => handleAeHelperChange("wallIntTightness", e.target.value)} className="w-full text-[11px] border-gray-200 border rounded p-1 dark:bg-[#242B51]">
                              <option value="tight">Szczelna (0.14 × 10⁻⁴ m²/m²)</option>
                              <option value="average">Przeciętna (1.1 × 10⁻⁴ m²/m²)</option>
                              <option value="leaky">Nieszczelna (3.5 × 10⁻⁴ m²/m²)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Pow. szybów windowych (jeśli w klatce) [m²]</label>
                            <input type="text" inputMode="decimal" value={aeHelper.wallElevArea} onChange={(e) => handleAeHelperChange("wallElevArea", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51] mb-2" />
                            <select value={aeHelper.wallElevTightness} onChange={(e) => handleAeHelperChange("wallElevTightness", e.target.value)} className="w-full text-[11px] border-gray-200 border rounded p-1 dark:bg-[#242B51]">
                              <option value="tight">Szczelna (1.8 × 10⁻⁴ m²/m²)</option>
                              <option value="average">Przeciętna (8.4 × 10⁻⁴ m²/m²)</option>
                              <option value="leaky">Nieszczelna (1.8 × 10⁻³ m²/m²)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Pow. stropu najwyższej kondygnacji [m²]</label>
                            <input type="text" inputMode="decimal" value={aeHelper.ceilingArea} onChange={(e) => handleAeHelperChange("ceilingArea", e.target.value)} className="w-full text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51] mb-2" />
                            <p className="text-[10px] text-gray-500 mt-1">Przyjęto szczelność przeciętną (0.52 × 10⁻⁴ m²/m²).</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
                        <label className="block text-xs font-bold mb-2">Dodatkowe nieszczelności i kratki transferowe [m²]</label>
                        <input type="text" inputMode="decimal" value={aeHelper.otherAe} onChange={(e) => handleAeHelperChange("otherAe", e.target.value)} className="w-full sm:w-1/2 text-sm border-gray-200 border rounded p-2 dark:bg-[#242B51]" />
                      </div>
                    </div>
                  )}

                  <div className="mt-8 rounded-md border border-body-color border-opacity-10 p-6">
                    <label className="mb-4 block text-sm font-bold text-dark dark:text-white ">
                      Parametry sieci przewodu wentylatora do klatki (Spręż / ΔP)
                    </label>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-dark dark:text-white">Typ instalacji tłocznej</label>
                        <select 
                          value={step4Data.installationType} 
                          onChange={(e) => handleStep4Change("installationType", e.target.value)}
                          className="w-full rounded-md border border-transparent px-5 py-3 text-sm shadow-one dark:bg-[#242B51]"
                        >
                          <option value="wall">Ścienny (wyrzut do klatki bezpośredni, 0 Pa)</option>
                          <option value="ducted">Kanałowy (obowiązek oporów i strat +15% szczelności)</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                          Opory i straty tłoczne kanału [Pa]
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="np. 45"
                          disabled={step4Data.installationType === 'wall'}
                          value={step4Data.ductPressureLoss}
                          onChange={(e) => handleStep4Change("ductPressureLoss", e.target.value)}
                          className="w-full rounded-md border border-transparent px-5 py-3 text-sm shadow-one dark:bg-[#242B51] disabled:opacity-50"
                        />
                        <p className="mt-1 text-[10px] text-body-color">Służy do domykania kalkulacji pełnego sprężu (wraz z oporami klatki i kompensacji) wg rozdz. 6.4.4.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step === 5 && results && (
          <div className="space-y-8 animate-fade-in">
            <div className="rounded-md bg-white p-8 shadow-two dark:bg-dark">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-black dark:text-white">Krok 5: Wyniki Obliczeń i Zestawienie Założeń</h2>
              </div>

              {/* PODSUMOWANIE ZAŁOŻEŃ (Tabela Inputów) */}
              <div className="mb-10 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1C213E] p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Podsumowanie przyjętych parametrów i geometrii</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Charakterystyka Obiektu</p>
                    <p className="text-sm font-semibold mt-1">Kat. ZL: <span className="font-bold text-primary">{step1Data.categoryZL.replace("_", " ")}</span></p>
                    <p className="text-sm font-semibold">Wysokość: <span className="font-bold text-primary">{step1Data.buildingHeightGroup}</span> ({step1Data.buildingHeightValue} {step1Data.buildingHeightType === 'floors' ? 'kond.' : 'm'})</p>
                    <p className="text-sm font-semibold">Kondygnacje klatki: <span className="font-bold text-primary">{step1Data.numberOfFloors}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Obudowa i Wydzielenie</p>
                    <p className="text-sm font-semibold mt-1">Ściany PPOŻ: <span className="font-bold text-primary">{step1Data.stairwellEnclosure === 'ppoż' ? "Tak" : "Nie"}</span></p>
                    <p className="text-sm font-semibold">Samozamykacze: <span className="font-bold text-primary">{step1Data.selfClosers ? "Tak (100%)" : "Niepełne"}</span></p>
                    <p className="text-sm font-semibold">Wydłuża dojścia: <span className="font-bold text-primary">{step1Data.expandsEvacuation ? "Tak" : "Nie"}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Geometria Klatki</p>
                    <p className="text-sm font-semibold mt-1">A<sub>KS</sub> (całkowita): <span className="font-bold text-primary">{parsedStep2.AKS} m²</span></p>
                    <p className="text-sm font-semibold">Biegi (A) / Spoczniki (B): <span className="font-bold text-primary">{parsedStep2.A} / {parsedStep2.B} m²</span></p>
                    <p className="text-sm font-semibold">Zredukowana A<sub>KS-O</sub>: <span className="font-bold text-primary">{results.AKS_O.toFixed(2)} m²</span></p>
                  </div>
                  {results.systemType === "MECHANICAL" && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Parametry przepływowe</p>
                      <p className="text-sm font-semibold mt-1">Pole nieszczelności (A<sub>e</sub>): <span className="font-bold text-primary">{parsedStep4.Ae} m²</span></p>
                      {!step1Data.selfClosers && <p className="text-sm font-semibold">Otwarte drzwi (A<sub>drzwi</sub>): <span className="font-bold text-primary">{parsedStep4.openDoorArea} m²</span></p>}
                      <p className="text-sm font-semibold">Nawiewnik: <span className="font-bold text-primary">{step4Data.installationType === 'wall' ? "Ścienny" : "Kanałowy"}</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* WYNIKI OBLICZEŃ (Output) */}
              <div className="space-y-6">
                <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800 dark:bg-opacity-50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-body-color dark:text-body-color-dark">Wymagane docelowe rozwiązanie wykonawcze (Wytyczne Rozdz. 4)</p>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-white uppercase tracking-wider">
                    {results.systemType === "GRAVITATIONAL" ? "System Oddymiania Grawitacyjnego" : "System z Nawiewem Mechanicznym"}
                  </p>
                </div>

                {results.systemType === "GRAVITATIONAL" && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-black dark:text-white border-b pb-2">Karta Osiągów: Wentylacja Grawitacyjna</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-md border-l-4 border-primary bg-primary bg-opacity-10 p-4">
                        <p className="text-xs text-body-color dark:text-body-color-dark">Wymagana powierzchnia czynna klap dymowych (<Tooltip text="Wyliczona jako min. 5% * A_KS-O (lub 7.5% dla W/WW mieszkalnych ZL IV) zgodnie ze wzorami 6.6 i 6.12.">A<sub>cz</sub></Tooltip>)</p>
                        <p className="mt-2 text-xl font-bold text-primary">{results.outputs.Acz} m²</p>
                      </div>
                      <div className="rounded-md border-l-4 border-primary bg-primary bg-opacity-10 p-4">
                        {results.outputs.Akomp_geom !== undefined && (
                          <>
                            <p className="text-xs text-body-color dark:text-body-color-dark">
                              Min. powierzchnia <strong>geometryczna</strong> do napływu kompensacyjnego (<Tooltip text="Oparta na regule: otwarcie drzwi 90st to wymóg wybudowania min. 130% powierzchni geometrycznej klapy oddymiającej na dole klatki (1,3 * A_odd_geom) wg rozdz. 6.3.2 wzór (6.8).">A<sub>komp_geom</sub></Tooltip>)
                            </p>
                            <p className="mt-2 text-xl font-bold text-primary">{results.outputs.Akomp_geom} m²</p>
                          </>
                        )}
                        {results.outputs.Akomp_eff !== undefined && (
                          <>
                            <p className="text-xs text-body-color dark:text-body-color-dark">
                              Min. powierzchnia <strong>efektywna</strong> do napływu kompensacyjnego (<Tooltip text="Oparta na regule dla klap i wyrzutów ściennych - wymóg kompensacji to min. 130% powierzchni geometrycznej okien dymowych (1,3 * A_odd_geom) wg wzoru (6.9).">A<sub>komp_eff</sub></Tooltip>)
                            </p>
                            <p className="mt-2 text-xl font-bold text-primary">{results.outputs.Akomp_eff} m²</p>
                          </>
                        )}
                        <p className="mt-2 text-[10px] text-body-color dark:text-body-color-dark italic">
                          💡 W celu obliczenia napływu wykorzystano bazowy współczynnik aerodynamiczny klapy C<sub>v</sub> = 0.6.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {results.systemType === "MECHANICAL" && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-black dark:text-white border-b pb-2">Karta Osiągów: Strumienie wentylatora (Nawiew Mechaniczny)</h3>
                    <div className="space-y-2 rounded-md bg-gray-50 p-4 dark:bg-gray-800 dark:bg-opacity-50">
                      <p className="text-sm">
                        Strumień zabezpieczający wymaganą prędkość 0.2 m/s na rzut (<Tooltip text="Wyznacza minimalny przepływ objętościowy potrzebny do osiągnięcia prędkości przelotowej 0,2 m/s przez wyliczoną w Kroku 2 zredukowaną powierzchnię A_KS-O. Wynika ze wzoru 6.13 Wytycznych W-0003:2016.">V<sub>n_min</sub></Tooltip>) = <strong>{results.outputs.vn_min} m³/h</strong>
                      </p>
                      <p className="text-sm">
                        Strumień zabezpieczający ucieczki na nieszczelnościach (<Tooltip text="Strumień potrzebny do zablokowania ucieczek ciśnienia we wprowadzonych w Kroku 4 szczelinach budowlanych (A_e) przy domyślnym nadciśnieniu 15 Pa. Wynika ze wzoru 6.14.">V<sub>n_p</sub></Tooltip>) = <strong>{results.outputs.vn_p} m³/h</strong>
                      </p>
                      <p className="text-sm text-primary border-t border-gray-200 pt-2 dark:border-gray-700">
                        <strong>Kryterium I - Przy zamkniętych drzwiach (<Tooltip text="Suma strumienia bazowego V_n_min i wycieków przy nieszczelnościach V_n_p (wzór 6.16 CNBOP). Stanowi bazę obliczeniową.">V<sub>n1</sub></Tooltip>) = {results.outputs.vn1} m³/h</strong>
                      </p>
                      
                      {results.outputs.vn_v !== undefined && (
                        <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                          <p className="text-sm">
                            Wydmuch wymuszony brakiem samozamykaczy (<Tooltip text="Strumień wydmuchiwany (uciekający) przez pozostawione otwarte drzwi, zakładając ucieczkę z prędkością 1,0 m/s przez pole pojedynczego skrzydła drzwiowego (zadeklarowane w asystencie) ze wzoru 6.17.">V<sub>n_v</sub></Tooltip>) = <strong>{results.outputs.vn_v} m³/h</strong>
                          </p>
                          <p className="text-sm text-primary">
                            <strong>Kryterium II - Z otwartymi drzwiami na objętej pozarem (<Tooltip text="Suma strumienia podstawowego i ucieczki przez otwarte, niedomykające się drzwi klatkowe wg wzoru 6.18.">V<sub>n2</sub></Tooltip>) = {results.outputs.vn2} m³/h</strong>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-md border-l-4 border-amber-500 bg-amber-500 bg-opacity-10 p-4">
                        <p className="text-xs text-body-color dark:text-body-color-dark">Powierzchnia czynna górnych klap dymowych (<Tooltip text="CNBOP nakazuje budowę powierzchni aerodynamicznej uwalniającej nadmiar dymu mimo mechaniki - min 5% A_KS-O (lub 7.5% ZL IV W/WW) i minimum 1,0 m² z rozdz. 6.4.1 oraz 6.4.2.">A<sub>cz</sub></Tooltip>)</p>
                        <p className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">{results.outputs.Acz} m²</p>
                      </div>
                      <div className="rounded-md border-l-4 border-primary bg-primary bg-opacity-10 p-4">
                        <p className="text-xs text-body-color dark:text-body-color-dark">Wypadkowa wartość maksymalna z obydwu kryteriów (<Tooltip text="Stanowi podstawę obliczeń wentylatora z równania V_n_max = MAX(Vn1, Vn2) wg punktu 6.19 Wytycznych CNBOP W-0003:2016.">V<sub>n_max</sub></Tooltip>)</p>
                        <p className="mt-2 text-xl font-bold text-primary">{results.outputs.vn_max} m³/h</p>
                      </div>
                      <div className="rounded-md border-l-4 border-green-500 bg-green-500 bg-opacity-10 p-4">
                        <p className="text-xs text-body-color dark:text-body-color-dark">Ostateczna wymagana wydajność projektowa z wentylatora (<Tooltip text="Zabezpiecza wartość powiększoną o dodatkowe 15% przecieków (wynikających z instalacji opartych o kanały a nie wolny zrzut ścianowy). Wynik z równania 6.20.">V<sub>went</sub></Tooltip>)</p>
                        <p className="mt-2 text-xl font-bold text-green-600 dark:text-green-400">{results.outputs.v_went} m³/h</p>
                      </div>
                    </div>
                    
                    <div className="rounded-md bg-blue-50 p-6 dark:bg-blue-900 dark:bg-opacity-20 mt-4 border border-blue-200 dark:border-blue-800">
                      <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Spręż Dyspozycyjny Wentylatora (<Tooltip text="Zjawisko określone w rozdz. 6.4.4. Określa jak mocno i z jakim rygorem wentylator zdoła wdmuchnąć powietrze przez straty całej trasy klatkowej i urządzeń kompensacyjnych na górze dachu.">ΔP</Tooltip>)</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Ostateczna wymagana wielkość ciśnienia nadmuchiwanego: <span className="font-bold text-lg">{results.outputs.totalPressure} Pa</span>. 
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 leading-relaxed">
                        Wg wytycznych rozdz. 6.4.4 wentylator (dla V<sub>went</sub>) musi obsłużyć:<br/>
                        • Normowe nadciśnienie wtłaczające na klatkę względem obrzeży (wymóg bezpieczeństwa 15 Pa).<br/>
                        • Pokonanie standardowego zjawiska oporowego narzuconego na dachu poprzez straty przelotu klapy (6 Pa).<br/>
                        • Stratę z tytułu wysokości konstrukcji od miejsca montażu aż pod dach: {step1Data.numberOfFloors} kondygnacji (× wymóg 3 Pa na kond. = {step1Data.numberOfFloors * 3} Pa).<br/>
                        • Zadeklarowane straty przez opory instalacji przewodów: {parsedStep4.ductPressureLoss} Pa.
                      </p>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {(results.cfnWarnings.cfnC || results.cfnWarnings.cfnD || results.cfnWarnings.cfnAKS) && (
              <div className="rounded-md border-2 border-red-500 bg-red-50 p-6 dark:border-red-700 dark:bg-red-900 dark:bg-opacity-20">
                <h3 className="mb-3 text-lg font-bold text-red-700 dark:text-red-300">⚠️ WYMAGANA WERYFIKACJA CFD</h3>
                <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                  Ze względu na wprowadzoną niestandardową geometrię Twojego projektu na klatce schodowej (przekroczenia wymogów z rozdz. 6.2 CNBOP), skuteczność wentylacji musi zostać potwierdzona komputerową symulacją pożaru.
                </p>
                <ul className="space-y-1 text-sm text-red-600 dark:text-red-400 font-semibold">
                  {results.cfnWarnings.cfnC && <li>• Otwory przelotowe (C) zajmują {parsedStep2.C} m², czyli &gt; 10% komunikacji (A+B) [wzór 6.4].</li>}
                  {results.cfnWarnings.cfnD && <li>• Dusza schodów (D) zajmuje {parsedStep2.D} m², czyli &gt; 25% komunikacji (A+B) [wzór 6.5].</li>}
                  {results.cfnWarnings.cfnAKS && <li>• Całkowita powierzchnia A<sub>KS</sub> ({parsedStep2.AKS} m²) przekracza dopuszczalny analityczny limit 40 m².</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-4">
          <button
            onClick={handleBackStep}
            disabled={step === 1}
            className="inline-flex items-center rounded-md border border-body-color border-opacity-20 px-8 py-3 text-base font-semibold text-body-color transition hover:bg-body-color hover:bg-opacity-5 disabled:opacity-50 dark:border-white dark:border-opacity-10 dark:text-body-color-dark"
          >
            ← Wstecz
          </button>

          {step < 4 && (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center rounded-md bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-opacity-90"
            >
              Dalej →
            </button>
          )}

          {step === 4 && (
            <button
              onClick={handleSubmit}
              className="inline-flex items-center rounded-md bg-green-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-green-600"
            >
              Oblicz Wyniki →
            </button>
          )}

          {step === 5 && (
            <button
              onClick={() => {
                setStep(1);
                setHasCalculated(false);
                scrollToTop();
              }}
              className="inline-flex items-center rounded-md bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-opacity-90"
            >
              Nowe Obliczenie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}