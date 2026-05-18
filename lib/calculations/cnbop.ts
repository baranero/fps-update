export interface Step1Data {
  categoryZL: 'ZL_I' | 'ZL_II' | 'ZL_III' | 'ZL_IV' | 'ZL_V' | 'PM';
  buildingHeightType: 'floors' | 'meters';
  buildingHeightValue: number;
  buildingHeightGroup: 'N' | 'SW' | 'W' | 'WW';
  buildingTypeWT: 'standard' | 'single_family' | 'nursery' | 'healthcare' | 'garage';
  numberOfFloorsTotal: number;
  numberOfFloorsAbove: number;
  numberOfFloorsBelow: number;
  expandsEvacuation: boolean;
  stairwellEnclosure: 'ppoż' | 'non-ppoż';
  selfClosers: boolean;
}

export interface FlightData { width: string; length: string; id: number; }
export interface LandingData { width: string; depth: string; id: number; }
export interface AreaData { area: string; id: number; }

export interface Step2aData {
  flights: FlightData[];
  landings: LandingData[];
  openings: AreaData[];
  cores: AreaData[];
  calculationMode: 'auto' | 'manual';
}

export interface Step2Data {
  AKS: string; A: string; B: string; C: string; D: string;
}

export interface Step4Data {
  ventInputMethod: 'dimensions' | 'geom_cv' | 'acz_cv';
  ventWidth: string; ventHeight: string; cv: string; count: string;
  ventAcz: string; ventAgeom: string;

  compInputMethod: 'known_acz' | 'calculate';
  compAcz: string;
  doorConfiguration: 'single' | 'double' | 'two_independent' | 'serial' | 'other';
  serialDistance: string;
  doorLeaves: { w: string; h: string; id: number }[];
  otherCompArea: string;
  
  Ae: string;
  openDoorArea: string;
  installationType: 'wall' | 'ducted';
  ductPressureLoss: string;
}

export interface CFDWarnings {
  cfnC: boolean; cfnD: boolean; cfnAKS: boolean; cfnSerialDoors: boolean;
}

export interface CalculationResults {
  systemType: 'GRAVITATIONAL' | 'MECHANICAL';
  AKS_O: number;
  cfnWarnings: CFDWarnings;
  outputs: {
    Acz?: number;
    Aodd_geom?: number;
    Akomp_eff?: number;
    Akomp_geom?: number;
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

export const toNum = (val: string | number): number => {
  if (val === "" || val === null || val === undefined) return 0;
  const parsed = Number(String(val).replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
};

export const toStr = (val: number, decimals: number = 2): string => {
  return val.toFixed(decimals).replace(".", ",");
};

export function classifyBuildingHeight(
  heightType: 'floors' | 'meters', heightValue: number, categoryZL: string
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
  A: number; B: number; C: number; D: number; AKS: number;
} {
  const A = data.flights.reduce((sum, f) => sum + (toNum(f.width) * toNum(f.length)), 0);
  const B = data.landings.reduce((sum, l) => sum + (toNum(l.width) * toNum(l.depth)), 0);
  const C = data.openings.reduce((sum, o) => sum + toNum(o.area), 0);
  const D = data.cores.reduce((sum, c) => sum + toNum(c.area), 0);
  const AKS = A + B + C + D;

  return {
    A: Math.max(0, A), B: Math.max(0, B), C: Math.max(0, C),
    D: Math.max(0, D), AKS: Math.max(0, AKS)
  };
}

export function determineSystemType(step1: Step1Data): 'GRAVITATIONAL' | 'MECHANICAL' {
  const { categoryZL, buildingHeightGroup, expandsEvacuation, stairwellEnclosure } = step1;

  if (categoryZL === 'ZL_IV') {
    if (buildingHeightGroup === 'WW' || buildingHeightGroup === 'W') return 'MECHANICAL';
    if (buildingHeightGroup === 'SW' && stairwellEnclosure === 'non-ppoż') return 'MECHANICAL';
    if (buildingHeightGroup === 'SW' && stairwellEnclosure === 'ppoż') return 'GRAVITATIONAL';
    if (buildingHeightGroup === 'N') return 'GRAVITATIONAL';
  }

  if (['ZL_I', 'ZL_II', 'ZL_III', 'ZL_V', 'PM'].includes(categoryZL)) {
    if (['WW', 'W', 'SW'].includes(buildingHeightGroup)) return 'MECHANICAL';
    if (buildingHeightGroup === 'N' && expandsEvacuation) return 'MECHANICAL';
    if (buildingHeightGroup === 'N' && !expandsEvacuation) return 'GRAVITATIONAL';
  }

  return 'GRAVITATIONAL';
}

export function calculateCFDWarnings(AKS: number, AB: number, C: number, D: number, isGravSerial: boolean): CFDWarnings {
  return { 
    cfnC: C > 0.1 * AB, 
    cfnD: D > 0.25 * AB, 
    cfnAKS: AKS > 40,
    cfnSerialDoors: isGravSerial 
  };
}

export function calculateGravitational(
  step1: Step1Data, step2: Step2Data, step4: Step4Data, calculatedAoddGeom: number
): CalculationResults {
  const A = toNum(step2.A); const B = toNum(step2.B); const C = toNum(step2.C); const D = toNum(step2.D);
  const AKS_O = A + B + C + D;

  const Acz = Math.max(0.05 * AKS_O, 1.0);
  
  const Aodd_geom = calculatedAoddGeom > 0 ? calculatedAoddGeom : Acz / 0.6; 
  const Akomp_base = 1.3 * Aodd_geom;
  const isDoor = step4.doorConfiguration !== 'other';

  const Akomp_geom = isDoor ? Akomp_base : undefined;
  const Akomp_eff  = isDoor ? undefined : Akomp_base;

  const isGravSerial = step4.doorConfiguration === 'serial' && toNum(step4.serialDistance) > 5;
  const cfnWarnings = calculateCFDWarnings(toNum(step2.AKS), A + B, C, D, isGravSerial);

  return {
    systemType: 'GRAVITATIONAL',
    AKS_O,
    cfnWarnings,
    outputs: {
      Acz: Number(Acz.toFixed(2)),
      Aodd_geom: Number(Aodd_geom.toFixed(2)),
      Akomp_geom: Akomp_geom ? Number(Akomp_geom.toFixed(2)) : undefined,
      Akomp_eff: Akomp_eff ? Number(Akomp_eff.toFixed(2)) : undefined,
    },
  };
}

export function calculateMechanical(
  step1: Step1Data, step2: Step2Data, step4: Step4Data, calculatedAoddGeom: number
): CalculationResults {
  const A = toNum(step2.A); const B = toNum(step2.B); const C = toNum(step2.C); const D = toNum(step2.D);
  const floors = Number(step1.numberOfFloorsTotal) || 1;
  const Ae = toNum(step4.Ae);
  const openDoorArea = toNum(step4.openDoorArea);

  const AKS_O = A + B + C + D;
  const vn_min = 0.2 * AKS_O * 3600;
  const vn_p = 0.83 * Ae * Math.sqrt(15) * 3600;
  const vn1 = vn_min + vn_p;

  let vn_max = vn1;
  let vn_v: number | undefined = undefined;
  let vn2: number | undefined = undefined;

  if (!step1.selfClosers && openDoorArea > 0) {
    vn_v = 1.0 * openDoorArea * 3600;
    vn2 = vn_min + vn_v;
    vn_max = Math.max(vn1, vn2);
  }

  const leakageFactor = step4.installationType === 'ducted' ? 1.15 : 1.0;
  const v_went = vn_max * leakageFactor;

  const pressureLossValue = step4.installationType === 'ducted' ? toNum(step4.ductPressureLoss) : 0;
  const totalPressure = 15 + 6 + (3 * floors) + pressureLossValue;

  const isHighZL_IV_W = step1.categoryZL === 'ZL_IV' && step1.buildingHeightGroup === 'W';
  const factor = isHighZL_IV_W ? 0.075 : 0.05;
  const minValue = isHighZL_IV_W ? 1.5 : 1.0;
  const Acz = Math.max(factor * AKS_O, minValue);

  const cfnWarnings = calculateCFDWarnings(toNum(step2.AKS), A + B, C, D, false);

  return {
    systemType: 'MECHANICAL',
    AKS_O,
    cfnWarnings,
    outputs: {
      Acz: Number(Acz.toFixed(2)),
      vn_min: Number(vn_min.toFixed(0)),
      vn_p: Number(vn_p.toFixed(0)),
      vn1: Number(vn1.toFixed(0)),
      vn_v: vn_v ? Number(vn_v.toFixed(0)) : undefined,
      vn2: vn2 ? Number(vn2.toFixed(0)) : undefined,
      vn_max: Number(vn_max.toFixed(0)),
      v_went: Number(v_went.toFixed(0)),
      totalPressure: Number(totalPressure.toFixed(0)),
    },
  };
}

export function validateStep2(
  step2: Step2Data, step2a?: Step2aData, minX?: number, minY?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (toNum(step2.A) <= 0) errors.push('Powierzchnia rzutów biegów schodów (A) musi być większa od 0');
  if (toNum(step2.B) <= 0) errors.push('Powierzchnia spoczników (B) musi być większa od 0');
  if (toNum(step2.C) < 0) errors.push('Powierzchnia pozostałych otworów (C) nie może być ujemna');
  if (toNum(step2.D) < 0) errors.push('Powierzchnia duszy schodów (D) nie może być ujemna');

  if (step2a && step2a.calculationMode === 'auto' && minX !== undefined && minY !== undefined) {
    let maxX = 0;
    
    step2a.flights.forEach((f, idx) => {
      const w = toNum(f.width);
      if (w > maxX) maxX = w;
      if (w > 0 && w < minX) {
        errors.push(`Bieg nr ${idx + 1}: szerokość (${toStr(w)} m) narusza minimum z WT §68 (min. ${toStr(minX)} m).`);
      }
    });

    step2a.landings.forEach((l, idx) => {
      const w = toNum(l.width);
      if (w > 0 && w < minY) {
        errors.push(`Spocznik nr ${idx + 1}: szerokość (${toStr(w)} m) narusza minimum z WT §68 (min. ${toStr(minY)} m).`);
      }
      if (w > 0 && w < maxX) {
        errors.push(`Spocznik nr ${idx + 1}: szerokość y (${toStr(w)} m) nie może być mniejsza niż największa szerokość biegu x (${toStr(maxX)} m) [rozdz. 6.2 CNBOP].`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}