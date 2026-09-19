import { describe, expect, it } from "vitest";
import {
  calculateCFDWarnings,
  calculateStaircaseAreas,
  classifyBuildingHeight,
  defaultVent,
  determineSystemType,
  isVentEmpty,
  openingGeomArea,
  toNum,
  toStr,
  totalVentAreas,
  ventUnitAreas,
} from "@/lib/calculations/cnbop";

// Kalkulator CNBOP liczy dobór oddymiania klatek schodowych wg wytycznych
// CNBOP-PIB W-0003:2016. Testy trzymają reguły wprost z wytycznych — progi
// wysokości, dobór rodzaju systemu, progi kierujące do analizy CFD — oraz
// arytmetykę powierzchni, którą łatwo zepsuć przy zmianie formularza.

describe("toNum / toStr", () => {
  it("czyta przecinek dziesiętny z formularza", () => {
    expect(toNum("1,5")).toBe(1.5);
    expect(toNum("0,60")).toBe(0.6);
    expect(toNum(2.25)).toBe(2.25);
  });

  it("pole puste albo nieliczbowe traktuje jak zero, a nie jak NaN", () => {
    expect(toNum("")).toBe(0);
    expect(toNum("abc")).toBe(0);
    expect(toNum(null as unknown as string)).toBe(0);
    expect(toNum(undefined as unknown as string)).toBe(0);
  });

  it("wypisuje liczby z przecinkiem i zadaną dokładnością", () => {
    expect(toStr(1.5)).toBe("1,50");
    expect(toStr(1.234, 3)).toBe("1,234");
    expect(toStr(10, 0)).toBe("10");
  });

  it("odczyt i zapis są wzajemnie odwrotne", () => {
    expect(toNum(toStr(3.14, 2))).toBe(3.14);
  });
});

describe("ventUnitAreas", () => {
  it("z wymiarów liczy powierzchnię geometryczną i czynną przez Cv", () => {
    const { Acz, Ageom } = ventUnitAreas({
      ...defaultVent(1), inputMethod: "dimensions",
      width: "1,0", height: "1,5", cv: "0,60", count: "2",
    });
    expect(Ageom).toBeCloseTo(3.0, 6);   // 1,0 × 1,5 × 2
    expect(Acz).toBeCloseTo(1.8, 6);     // × Cv 0,60
  });

  it("przyjmuje Cv = 0,60, gdy pole zostało puste", () => {
    const { Acz } = ventUnitAreas({
      ...defaultVent(1), inputMethod: "dimensions",
      width: "2", height: "1", cv: "", count: "1",
    });
    expect(Acz).toBeCloseTo(1.2, 6);
  });

  it("z podanej powierzchni geometrycznej liczy czynną", () => {
    const { Acz, Ageom } = ventUnitAreas({
      ...defaultVent(1), inputMethod: "geom_cv", ageom: "4,0", cv: "0,55",
    });
    expect(Ageom).toBeCloseTo(4.0, 6);
    expect(Acz).toBeCloseTo(2.2, 6);
  });

  it("z podanej powierzchni czynnej odtwarza geometryczną", () => {
    const { Acz, Ageom } = ventUnitAreas({
      ...defaultVent(1), inputMethod: "acz_cv", acz: "1,8", cv: "0,60",
    });
    expect(Acz).toBeCloseTo(1.8, 6);
    expect(Ageom).toBeCloseTo(3.0, 6);
  });

  it("powierzchnia czynna z katalogu mnoży się przez liczbę klap", () => {
    const { Acz, Ageom } = ventUnitAreas({
      ...defaultVent(1), inputMethod: "size_acz", sizeMethod: "dimensions",
      width: "0,8", height: "0,8", acz: "0,35", count: "3",
    });
    expect(Acz).toBeCloseTo(1.05, 6);    // 3 × 0,35 z karty katalogowej
    expect(Ageom).toBeCloseTo(1.92, 6);  // 3 × 0,8 × 0,8
  });

  it("nie dzieli przez zero przy Cv = 0", () => {
    const { Ageom } = ventUnitAreas({ ...defaultVent(1), inputMethod: "acz_cv", acz: "1,0", cv: "0" });
    expect(Number.isFinite(Ageom)).toBe(true);
  });
});

describe("totalVentAreas", () => {
  it("sumuje wszystkie klapy", () => {
    const klapa = { ...defaultVent(1), inputMethod: "dimensions" as const, width: "1", height: "1", cv: "0,60", count: "1" };
    const { Acz, Ageom } = totalVentAreas([klapa, { ...klapa, id: 2 }]);
    expect(Ageom).toBeCloseTo(2, 6);
    expect(Acz).toBeCloseTo(1.2, 6);
  });

  it("pusta lista daje zera zamiast rzucać", () => {
    expect(totalVentAreas([])).toEqual({ Acz: 0, Ageom: 0 });
    expect(totalVentAreas(undefined as never)).toEqual({ Acz: 0, Ageom: 0 });
  });
});

describe("isVentEmpty", () => {
  it("świeża klapa z formularza jest pusta", () => {
    expect(isVentEmpty(defaultVent(1))).toBe(true);
  });

  it("wypełnienie dowolnego pola powierzchni czyni ją niepustą", () => {
    expect(isVentEmpty({ ...defaultVent(1), width: "1" })).toBe(false);
    expect(isVentEmpty({ ...defaultVent(1), acz: "0,5" })).toBe(false);
  });
});

describe("classifyBuildingHeight", () => {
  it("dla kondygnacji trzyma progi 4 / 9 / 18", () => {
    expect(classifyBuildingHeight("floors", 4, "ZL_III")).toBe("N");
    expect(classifyBuildingHeight("floors", 5, "ZL_III")).toBe("SW");
    expect(classifyBuildingHeight("floors", 9, "ZL_III")).toBe("SW");
    expect(classifyBuildingHeight("floors", 10, "ZL_III")).toBe("W");
    expect(classifyBuildingHeight("floors", 18, "ZL_III")).toBe("W");
    expect(classifyBuildingHeight("floors", 19, "ZL_III")).toBe("WW");
  });

  it("dla metrów trzyma progi 12 / 25 / 55", () => {
    expect(classifyBuildingHeight("meters", 12, "ZL_III")).toBe("N");
    expect(classifyBuildingHeight("meters", 12.1, "ZL_III")).toBe("SW");
    expect(classifyBuildingHeight("meters", 25, "ZL_III")).toBe("SW");
    expect(classifyBuildingHeight("meters", 25.1, "ZL_III")).toBe("W");
    expect(classifyBuildingHeight("meters", 55, "ZL_III")).toBe("W");
    expect(classifyBuildingHeight("meters", 55.1, "ZL_III")).toBe("WW");
  });

  it("ZL IV liczy się kondygnacjami także przy wysokości podanej w metrach", () => {
    // Budynki mieszkalne klasyfikuje liczba kondygnacji — 12 wpada w próg
    // kondygnacyjny, nie w metrowy.
    expect(classifyBuildingHeight("meters", 12, "ZL_IV")).toBe("W");
    expect(classifyBuildingHeight("meters", 12, "ZL_III")).toBe("N");
  });
});

describe("determineSystemType", () => {
  const step1 = (over: Record<string, unknown>) => ({
    categoryZL: "ZL_III", buildingHeightGroup: "N",
    expandsEvacuation: false, stairwellEnclosure: "ppoż",
    ...over,
  }) as never;

  it("ZL IV: wysokie i wysokościowe zawsze mechanicznie", () => {
    expect(determineSystemType(step1({ categoryZL: "ZL_IV", buildingHeightGroup: "WW" }))).toBe("MECHANICAL");
    expect(determineSystemType(step1({ categoryZL: "ZL_IV", buildingHeightGroup: "W" }))).toBe("MECHANICAL");
  });

  it("ZL IV średniowysokie: rozstrzyga obudowa klatki", () => {
    expect(determineSystemType(step1({ categoryZL: "ZL_IV", buildingHeightGroup: "SW", stairwellEnclosure: "ppoż" }))).toBe("GRAVITATIONAL");
    expect(determineSystemType(step1({ categoryZL: "ZL_IV", buildingHeightGroup: "SW", stairwellEnclosure: "non-ppoż" }))).toBe("MECHANICAL");
  });

  it("pozostałe kategorie: od średniowysokiego w górę mechanicznie", () => {
    for (const grupa of ["SW", "W", "WW"]) {
      expect(determineSystemType(step1({ categoryZL: "ZL_II", buildingHeightGroup: grupa }))).toBe("MECHANICAL");
    }
  });

  it("niskie budynki: rozstrzyga poszerzenie drogi ewakuacyjnej", () => {
    expect(determineSystemType(step1({ buildingHeightGroup: "N", expandsEvacuation: true }))).toBe("MECHANICAL");
    expect(determineSystemType(step1({ buildingHeightGroup: "N", expandsEvacuation: false }))).toBe("GRAVITATIONAL");
  });
});

describe("calculateStaircaseAreas", () => {
  it("sumuje biegi, spoczniki, otwory i trzony w AKS", () => {
    const wynik = calculateStaircaseAreas({
      flights: [{ width: "1,2", length: "3,0" }, { width: "1,2", length: "3,0" }],
      landings: [{ width: "1,2", depth: "2,0" }],
      openings: [{ area: "0,5" }],
      cores: [{ area: "1,0" }],
    } as never);

    expect(wynik.A).toBeCloseTo(7.2, 6);
    expect(wynik.B).toBeCloseTo(2.4, 6);
    expect(wynik.C).toBeCloseTo(0.5, 6);
    expect(wynik.D).toBeCloseTo(1.0, 6);
    expect(wynik.AKS).toBeCloseTo(11.1, 6);
  });

  it("nigdy nie oddaje powierzchni ujemnej", () => {
    const wynik = calculateStaircaseAreas({
      flights: [{ width: "-5", length: "2" }], landings: [], openings: [], cores: [],
    } as never);
    expect(wynik.A).toBe(0);
    expect(wynik.AKS).toBe(0);
  });

  it("pusta klatka daje same zera", () => {
    const wynik = calculateStaircaseAreas({ flights: [], landings: [], openings: [], cores: [] } as never);
    expect(wynik).toEqual({ A: 0, B: 0, C: 0, D: 0, AKS: 0 });
  });
});

describe("calculateCFDWarnings", () => {
  it("kieruje do CFD, gdy otwory przekraczają 10% powierzchni biegów i spoczników", () => {
    expect(calculateCFDWarnings(20, 10, 1.01, 0, false).cfnC).toBe(true);
    expect(calculateCFDWarnings(20, 10, 0.99, 0, false).cfnC).toBe(false);
  });

  it("kieruje do CFD, gdy trzon przekracza 25% A+B", () => {
    expect(calculateCFDWarnings(20, 10, 0, 2.51, false).cfnD).toBe(true);
    expect(calculateCFDWarnings(20, 10, 0, 2.49, false).cfnD).toBe(false);
  });

  it("kieruje do CFD przy klatce powyżej 40 m2", () => {
    expect(calculateCFDWarnings(40.1, 10, 0, 0, false).cfnAKS).toBe(true);
    expect(calculateCFDWarnings(40, 10, 0, 0, false).cfnAKS).toBe(false);
  });

  it("przenosi ostrzeżenie o drzwiach szeregowych bez zmian", () => {
    expect(calculateCFDWarnings(10, 10, 0, 0, true).cfnSerialDoors).toBe(true);
  });
});

describe("openingGeomArea", () => {
  it("drzwi jednoskrzydłowe: szerokość × wysokość", () => {
    expect(openingGeomArea({ type: "door_single", w: "0,9", h: "2,0" } as never)).toBeCloseTo(1.8, 6);
  });

  it("drzwi dwuskrzydłowe bez drugiego skrzydła: obydwa równe", () => {
    expect(openingGeomArea({ type: "door_double", w: "0,9", h: "2,0" } as never)).toBeCloseTo(3.6, 6);
  });

  it("drzwi dwuskrzydłowe z podanym drugim skrzydłem: suma szerokości", () => {
    expect(openingGeomArea({ type: "door_double", w: "0,9", w2: "0,6", h: "2,0" } as never)).toBeCloseTo(3.0, 6);
  });

  it("dla pozostałych otworów bierze podaną powierzchnię", () => {
    expect(openingGeomArea({ type: "window", area: "1,25" } as never)).toBeCloseTo(1.25, 6);
  });
});
