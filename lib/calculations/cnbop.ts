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

export type CompOpeningType = 'door_single' | 'door_double' | 'window' | 'louvre' | 'other';

export interface CompOpening {
  id: number;
  type: CompOpeningType;
  w: string;
  h: string;
  area: string;
  // second leaf width for door_double; empty ⇒ equal to the first leaf (2 × w)
  w2?: string;
}

export interface CompGroup {
  id: number;
  openings: CompOpening[];
  distances: string[];
}

// dimensions / geom_cv / acz_cv use Cv to relate geometric ↔ active area.
// size_acz: geometric size given as dimensions OR area (sizeMethod), plus the
// active area (Acz) entered directly from the datasheet — no Cv assumption.
export type VentInputMethod = 'dimensions' | 'geom_cv' | 'acz_cv' | 'size_acz';
export type VentSizeMethod = 'dimensions' | 'geom';

export interface VentUnit {
  id: number;
  inputMethod: VentInputMethod;
  width: string; height: string; cv: string; count: string;
  ageom: string; acz: string;
  // only for the size_acz method — how the geometric size is provided
  sizeMethod: VentSizeMethod;
}

export interface Step4Data {
  vents: VentUnit[];

  // Manual override of the recommended system type; null = follow the automatic
  // determineSystemType() recommendation.
  systemTypeOverride: 'GRAVITATIONAL' | 'MECHANICAL' | null;

  compInputMethod: 'known_acz' | 'calculate';
  compArrangement: 'parallel' | 'series';
  compAcz: string;
  compGroups: CompGroup[];

  Ae: string;
  Adrzwi: string;
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
    vWent?: number;
    sprez?: number;
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

export function defaultVent(id?: number): VentUnit {
  return {
    id: id ?? Date.now(),
    inputMethod: 'dimensions',
    width: '', height: '', cv: '0,60', count: '1',
    ageom: '', acz: '',
    sizeMethod: 'dimensions',
  };
}

export function isVentEmpty(v: VentUnit): boolean {
  return !v.width && !v.height && !v.ageom && !v.acz;
}

// Aerodynamic (czynna) and geometric area for a single smoke damper (klapa).
// count multiplies the dimensions and size_acz methods; the Cv-only area methods
// (geom_cv / acz_cv) take a total value (matching the catalog helper).
export function ventUnitAreas(v: VentUnit): { Acz: number; Ageom: number } {
  const cv = toNum(v.cv) || 0.6;
  if (v.inputMethod === 'dimensions') {
    const Ageom = toNum(v.width) * toNum(v.height) * (toNum(v.count) || 1);
    return { Acz: Ageom * cv, Ageom };
  }
  if (v.inputMethod === 'geom_cv') {
    const Ageom = toNum(v.ageom);
    return { Acz: Ageom * cv, Ageom };
  }
  if (v.inputMethod === 'size_acz') {
    const n = toNum(v.count) || 1;
    const geomPer = v.sizeMethod === 'geom' ? toNum(v.ageom) : toNum(v.width) * toNum(v.height);
    return { Acz: toNum(v.acz) * n, Ageom: geomPer * n };
  }
  const Acz = toNum(v.acz);
  return { Acz, Ageom: cv > 0 ? Acz / cv : 0 };
}

export function totalVentAreas(vents: VentUnit[]): { Acz: number; Ageom: number } {
  return (vents ?? []).reduce(
    (acc, v) => {
      const { Acz, Ageom } = ventUnitAreas(v);
      return { Acz: acc.Acz + Acz, Ageom: acc.Ageom + Ageom };
    },
    { Acz: 0, Ageom: 0 }
  );
}

// Fills in any missing/added VentUnit fields (e.g. sizeMethod) so vents saved by
// an older version of the calculator restore cleanly.
function coerceVentUnit(v: any, idx: number): VentUnit {
  const base = defaultVent(typeof v?.id === 'number' ? v.id : Date.now() + idx);
  if (!v || typeof v !== 'object') return base;
  const validMethods: VentInputMethod[] = ['dimensions', 'geom_cv', 'acz_cv', 'size_acz'];
  return {
    ...base,
    inputMethod: validMethods.includes(v.inputMethod) ? v.inputMethod : 'dimensions',
    sizeMethod: v.sizeMethod === 'geom' ? 'geom' : 'dimensions',
    width: v.width ?? '',
    height: v.height ?? '',
    cv: v.cv ?? '0,60',
    count: v.count ?? '1',
    ageom: v.ageom ?? '',
    acz: v.acz ?? '',
  };
}

// Restores a Step4Data from history / share URLs, migrating the pre-multi-vent
// shape (single ventInputMethod/ventWidth/… fields) into a one-element vents[].
export function normalizeStep4Data(raw: any): Step4Data {
  const fallbackGroups: CompGroup[] = [{
    id: Date.now(),
    openings: [{ id: Date.now() + 1, type: 'door_single', w: '', h: '', area: '' }],
    distances: [],
  }];

  if (!raw || typeof raw !== 'object') {
    return {
      vents: [defaultVent()],
      systemTypeOverride: null,
      compInputMethod: 'calculate', compArrangement: 'parallel', compAcz: '',
      compGroups: fallbackGroups,
      Ae: '', Adrzwi: '', installationType: 'wall', ductPressureLoss: '',
    };
  }

  const ventsRaw: any[] = Array.isArray(raw.vents) && raw.vents.length > 0
    ? raw.vents
    : [{
        inputMethod: raw.ventInputMethod ?? 'dimensions',
        width: raw.ventWidth ?? '',
        height: raw.ventHeight ?? '',
        cv: raw.cv ?? '0,60',
        count: raw.count ?? '1',
        ageom: raw.ventAgeom ?? '',
        acz: raw.ventAcz ?? '',
      }];
  const vents: VentUnit[] = ventsRaw.map((v, i) => coerceVentUnit(v, i));

  return {
    vents,
    systemTypeOverride: raw.systemTypeOverride === 'GRAVITATIONAL' || raw.systemTypeOverride === 'MECHANICAL'
      ? raw.systemTypeOverride
      : null,
    compInputMethod: raw.compInputMethod ?? 'calculate',
    compArrangement: raw.compArrangement ?? 'parallel',
    compAcz: raw.compAcz ?? '',
    compGroups: Array.isArray(raw.compGroups) && raw.compGroups.length > 0 ? raw.compGroups : fallbackGroups,
    Ae: raw.Ae ?? '',
    Adrzwi: raw.Adrzwi ?? '',
    installationType: raw.installationType ?? 'wall',
    ductPressureLoss: raw.ductPressureLoss ?? '',
  };
}

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
    cfnSerialDoors: isGravSerial,
  };
}

export function openingGeomArea(o: CompOpening): number {
  if (o.type === 'door_single') return toNum(o.w) * toNum(o.h);
  if (o.type === 'door_double') {
    const w1 = toNum(o.w);
    const w2 = toNum(o.w2);
    // second leaf unset ⇒ both leaves equal (2 × w1); otherwise (w1 + w2)
    const totalWidth = w2 > 0 ? w1 + w2 : 2 * w1;
    return totalWidth * toNum(o.h);
  }
  return toNum(o.area);
}

export function calculateCompGroups(groups: CompGroup[]): {
  totalAgeom: number;
  totalAeff: number;
  hasSerialsOverFiveM: boolean;
} {
  let totalAgeom = 0;
  let totalAeff = 0;
  let hasSerialsOverFiveM = false;

  for (const group of groups) {
    if (group.openings.length === 0) continue;
    group.distances.forEach(d => { if (toNum(d) > 5) hasSerialsOverFiveM = true; });

    const effs = group.openings.map(openingGeomArea);

    if (group.openings.length === 1) {
      totalAgeom += effs[0];
      totalAeff += effs[0];
    } else {
      // Układ szeregowy: miarodajny jest najmniejszy otwór (przewężenie) —
      // powierzchni (ani czynnej, ani geometrycznej) nie sumujemy.
      const valid = effs.filter(a => a > 0);
      if (valid.length > 0) {
        const smallest = Math.min(...valid);
        totalAgeom += smallest;
        totalAeff += smallest;
      }
    }
  }

  return { totalAgeom, totalAeff, hasSerialsOverFiveM };
}

export function calculateGravitational(
  _step1: Step1Data, step2: Step2Data, step4: Step4Data, calculatedAoddGeom: number
): CalculationResults {
  const A = toNum(step2.A); const B = toNum(step2.B); const C = toNum(step2.C); const D = toNum(step2.D);
  const AKS_O = A + B + C + D;

  const Acz = Math.max(0.05 * AKS_O, 1.0);
  const Aodd_geom = calculatedAoddGeom > 0 ? calculatedAoddGeom : Acz / 0.6;
  const Akomp_eff = 1.3 * Aodd_geom;

  const { hasSerialsOverFiveM } = calculateCompGroups(step4.compGroups);
  const cfnWarnings = calculateCFDWarnings(toNum(step2.AKS), A + B, C, D, hasSerialsOverFiveM);

  return {
    systemType: 'GRAVITATIONAL',
    AKS_O,
    cfnWarnings,
    outputs: {
      Acz: Number(Acz.toFixed(2)),
      Aodd_geom: Number(Aodd_geom.toFixed(2)),
      Akomp_eff: Number(Akomp_eff.toFixed(2)),
    },
  };
}

export function calculateMechanical(
  step1: Step1Data, step2: Step2Data, step4: Step4Data, _calculatedAoddGeom: number
): CalculationResults {
  const A = toNum(step2.A); const B = toNum(step2.B); const C = toNum(step2.C); const D = toNum(step2.D);
  const floors = Number(step1.numberOfFloorsTotal) || 1;
  const Ae = toNum(step4.Ae);
  const Adrzwi = toNum(step4.Adrzwi);

  const AKS_O = A + B + C + D;
  const vn_min = 0.2 * AKS_O * 3600;
  const vn_p = 0.83 * Ae * Math.sqrt(15) * 3600;
  const vn1 = vn_min + vn_p;

  let vn_max = vn1;
  let vn_v: number | undefined = undefined;
  let vn2: number | undefined = undefined;

  if (!step1.selfClosers && Adrzwi > 0) {
    vn_v = 1.0 * Adrzwi * 3600;
    vn2 = vn_min + vn_v;
    vn_max = Math.max(vn1, vn2);
  }

  const leakageFactor = step4.installationType === 'ducted' ? 1.15 : 1.0;
  const vWent = vn_max * leakageFactor;

  const dPKanaly = step4.installationType === 'ducted' ? toNum(step4.ductPressureLoss) : 0;
  const sprez = 6 + (3 * floors) + dPKanaly;

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
      vWent: Number(vWent.toFixed(0)),
      sprez: Number(sprez.toFixed(0)),
    },
  };
}

export interface CFDConditions {
  corrLength: boolean;
  doorDist: boolean;
  corrWidth: boolean;
  highNoSeparation: boolean;
}

export interface ExtraCFD {
  corrLength: boolean;
  doorDist: boolean;
  corrWidth: boolean;
  zlIVHighAuto: boolean;
  highNoSeparation: boolean;
}

export interface AeHelperState {
  enabled: boolean;
  doorsIn: string;
  doorsOut: string;
  doorsDouble: string;
  doorsElevator: string;
  windowLength: string;
  windowType: 'unsealed' | 'sealed' | 'sliding';
  wallExtArea: string;
  wallExtTightness: 'tight' | 'average' | 'leaky' | 'very_leaky';
  wallIntArea: string;
  wallIntTightness: 'tight' | 'average' | 'leaky';
  wallElevArea: string;
  wallElevTightness: 'tight' | 'average' | 'leaky';
  ceilingArea: string;
  otherAe: string;
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