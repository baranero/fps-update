export interface Step1Data {
  categoryZL: 'ZL_I' | 'ZL_II' | 'ZL_III' | 'ZL_IV' | 'ZL_V' | 'PM';
  buildingHeightType: 'floors' | 'meters';
  buildingHeightValue: number;
  buildingHeightGroup: 'N' | 'SW' | 'W' | 'WW';
  buildingTypeWT: 'standard' | 'healthcare' | 'garage'; // NOWE: Rodzaj budynku wg WT § 68
  numberOfFloors: number;
  expandsEvacuation: boolean;
  stairwellEnclosure: 'ppoż' | 'non-ppoż';
  selfClosers: boolean;
}

export interface FlightData {
  width: number;
  length: number;
}

export interface LandingData {
  width: number;
  depth: number;
}

export interface AreaData {
  area: number;
}

export interface Step2aData {
  flights: FlightData[];
  landings: LandingData[];
  openings: AreaData[];
  cores: AreaData[];
  calculationMode: 'auto' | 'manual';
}

export interface Step2Data {
  AKS: number;
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface Step4Data {
  compensationType?: 'doors_90' | 'other';
  Ae?: number;
  openDoorArea?: number;
  installationType: 'wall' | 'ducted';
  ductPressureLoss: number;
}

export interface CFDWarnings {
  cfnC: boolean;
  cfnD: boolean;
  cfnAKS: boolean;
}

export interface CalculationResults {
  systemType: 'GRAVITATIONAL' | 'MECHANICAL';
  AKS_O: number;
  cfnWarnings: CFDWarnings;
  outputs: {
    Acz?: number;
    Akomp_geom?: number;
    Akomp_eff?: number;
    vn_min?: number;
    vn_p?: number;
    vn1?: number;
    vn_v?: number;
    vn2?: number;
    vn_max?: number;
    v_went?: number;
    totalPressure?: number;
  };
}

export function classifyBuildingHeight(
  heightType: 'floors' | 'meters',
  heightValue: number,
  categoryZL: string
): 'N' | 'SW' | 'W' | 'WW' {
  if (categoryZL === 'ZL_IV' || heightType === 'floors') {
    if (heightValue <= 4) return 'N';
    if (heightValue > 4 && heightValue <= 9) return 'SW';
    if (heightValue > 9 && heightValue <= 18) return 'W';
    return 'WW';
  } else {
    if (heightValue <= 12) return 'N';
    if (heightValue > 12 && heightValue <= 25) return 'SW';
    if (heightValue > 25 && heightValue <= 55) return 'W';
    return 'WW';
  }
}

export function calculateStaircaseAreas(data: Step2aData): {
  A: number;
  B: number;
  C: number;
  D: number;
  AKS: number;
} {
  const A = data.flights.reduce((sum, f) => sum + (f.width * f.length), 0);
  const B = data.landings.reduce((sum, l) => sum + (l.width * l.depth), 0);
  const C = data.openings.reduce((sum, o) => sum + o.area, 0);
  const D = data.cores.reduce((sum, c) => sum + c.area, 0);
  
  const AKS = A + B + C + D;

  return { 
    A: Math.max(0, A), 
    B: Math.max(0, B), 
    C: Math.max(0, C), 
    D: Math.max(0, D), 
    AKS: Math.max(0, AKS) 
  };
}

export function determineSystemType(step1: Step1Data): 'GRAVITATIONAL' | 'MECHANICAL' {
  const { categoryZL, buildingHeightGroup, expandsEvacuation, stairwellEnclosure } = step1;

  if (categoryZL === 'ZL_IV') {
    if (buildingHeightGroup === 'WW') return 'MECHANICAL';
    if (buildingHeightGroup === 'W') return 'MECHANICAL';
    if (buildingHeightGroup === 'SW' && stairwellEnclosure === 'non-ppoż') return 'MECHANICAL';
    if (buildingHeightGroup === 'SW' && stairwellEnclosure === 'ppoż') return 'GRAVITATIONAL';
    if (buildingHeightGroup === 'N') return 'GRAVITATIONAL';
  }

  if (['ZL_I', 'ZL_II', 'ZL_III', 'ZL_V', 'PM'].includes(categoryZL)) {
    if (buildingHeightGroup === 'WW') return 'MECHANICAL';
    if (buildingHeightGroup === 'W') return 'MECHANICAL';
    if (buildingHeightGroup === 'SW') return 'MECHANICAL';
    if (buildingHeightGroup === 'N' && expandsEvacuation) return 'MECHANICAL';
    if (buildingHeightGroup === 'N' && !expandsEvacuation) return 'GRAVITATIONAL';
  }

  return 'GRAVITATIONAL';
}

export function calculateCFDWarnings(
  AKS: number,
  AB: number,
  C: number,
  D: number
): CFDWarnings {
  return {
    cfnC: C > 0.1 * AB,
    cfnD: D > 0.25 * AB,
    cfnAKS: AKS > 40,
  };
}

export function calculateGravitational(
  step1: Step1Data,
  step2: Step2Data,
  step4: Step4Data
): CalculationResults {
  const { A, B, C, D, AKS } = step2;
  const AKS_O = A + B + C + D; 

  const isHighZL_IV = step1.categoryZL === 'ZL_IV' && (step1.buildingHeightGroup === 'W' || step1.buildingHeightGroup === 'WW');
  const factor = isHighZL_IV ? 0.075 : 0.05;
  const minValue = isHighZL_IV ? 1.5 : 1.0;
  
  const Acz = Math.max(factor * AKS_O, minValue);
  
  const Cv = 0.6;
  const Aodd_geom = Acz / Cv;

  let Akomp_geom: number | undefined = undefined;
  let Akomp_eff: number | undefined = undefined;

  if (step4.compensationType === 'doors_90') {
    Akomp_geom = 1.3 * Aodd_geom;
  } else {
    Akomp_eff = 1.3 * Aodd_geom;
  }

  const cfnWarnings = calculateCFDWarnings(AKS, A + B, C, D);

  return {
    systemType: 'GRAVITATIONAL',
    AKS_O,
    cfnWarnings,
    outputs: {
      Acz: Number(Acz.toFixed(2)),
      Akomp_geom: Akomp_geom ? Number(Akomp_geom.toFixed(2)) : undefined,
      Akomp_eff: Akomp_eff ? Number(Akomp_eff.toFixed(2)) : undefined,
    },
  };
}

export function calculateMechanical(
  step1: Step1Data,
  step2: Step2Data,
  step4: Step4Data
): CalculationResults {
  const { A, B, C, D, AKS } = step2;
  const { Ae = 0, openDoorArea = 0, installationType, ductPressureLoss } = step4;
  const floors = step1.numberOfFloors || 1;

  const AKS_O = A + B + C + D;
  const vn_min = 0.2 * AKS_O * 3600;
  const vn_p = 0.83 * Ae * Math.sqrt(15) * 3600;
  const vn1 = vn_min + vn_p;

  let vn_max = vn1;

  if (!step1.selfClosers && openDoorArea > 0) {
    const vn_v = 1.0 * openDoorArea * 3600;
    const vn2 = vn_min + vn_v;
    vn_max = Math.max(vn1, vn2);
  }

  const leakageFactor = installationType === 'ducted' ? 1.15 : 1.0;
  const v_went = vn_max * leakageFactor;

  const pressureLossValue = installationType === 'ducted' ? (Number(ductPressureLoss) || 0) : 0;
  const totalPressure = 6 + (3 * floors) + pressureLossValue;

  const isHighZL_IV = step1.categoryZL === 'ZL_IV' && (step1.buildingHeightGroup === 'W' || step1.buildingHeightGroup === 'WW');
  const factor = isHighZL_IV ? 0.075 : 0.05;
  const minValue = isHighZL_IV ? 1.5 : 1.0;
  const Acz = Math.max(factor * AKS_O, minValue);

  const cfnWarnings = calculateCFDWarnings(AKS, A + B, C, D);

  return {
    systemType: 'MECHANICAL',
    AKS_O,
    cfnWarnings,
    outputs: {
      Acz: Number(Acz.toFixed(2)),
      vn_min: Number(vn_min.toFixed(0)),
      vn_p: Number(vn_p.toFixed(0)),
      vn1: Number(vn1.toFixed(0)),
      vn_v: !step1.selfClosers && openDoorArea > 0 ? Number((1.0 * openDoorArea * 3600).toFixed(0)) : undefined,
      vn2: !step1.selfClosers && openDoorArea > 0 ? Number((vn_min + 1.0 * openDoorArea * 3600).toFixed(0)) : undefined,
      vn_max: Number(vn_max.toFixed(0)),
      v_went: Number(v_went.toFixed(0)),
      totalPressure: Number(totalPressure.toFixed(0)),
    },
  };
}

export function validateStep2(
  step2: Step2Data, 
  step2a?: Step2aData, 
  minX?: number, 
  minY?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!step2.AKS || step2.AKS <= 0) errors.push('Całkowita powierzchnia klatki schodowej (po podsumowaniu) musi być większa od 0');
  if (!step2.A || step2.A <= 0) errors.push('Powierzchnia rzutów biegów schodów (A) musi być większa od 0');
  if (!step2.B || step2.B <= 0) errors.push('Powierzchnia spoczników (B) musi być większa od 0');
  if (step2.C === undefined || step2.C < 0) errors.push('Powierzchnia pozostałych otworów (C) nie może być ujemna');
  if (step2.D === undefined || step2.D < 0) errors.push('Powierzchnia duszy schodów (D) nie może być ujemna');

  // Walidacja rygoru z Warunków Technicznych § 68 w trybie AUTO
  if (step2a && step2a.calculationMode === 'auto' && minX !== undefined && minY !== undefined) {
    step2a.flights.forEach((f, idx) => {
       if (f.width > 0 && f.width < minX) {
           errors.push(`Bieg nr ${idx+1}: zadeklarowana szerokość (${f.width} m) narusza minimalne wymagania prawne z WT dla tego typu budynku (min. ${minX} m).`);
       }
    });
    step2a.landings.forEach((l, idx) => {
       if (l.width > 0 && l.width < minY) {
           errors.push(`Spocznik nr ${idx+1}: zadeklarowana szerokość (${l.width} m) narusza minimalne wymagania prawne z WT dla tego typu budynku (min. ${minY} m).`);
       }
    });
 }

  return {
    valid: errors.length === 0,
    errors,
  };
}