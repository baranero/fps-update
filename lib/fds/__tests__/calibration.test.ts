import { describe, expect, it } from "vitest";
import { deriveCalibration, type RunMeasurement } from "@/lib/fds/calibration";
import { DEFAULT_CALIBRATION } from "@/lib/fds/planner";

// Widełki prognozy to jedyna informacja, jaką klient dostaje o niepewności
// wyceny. Dotąd były zakodowane na sztywno i biegi lądowały poza pasmem, które
// miało je obejmować. Testy pilnują, żeby pasmo wynikało z danych i żeby nigdy
// nie zwęziło się poniżej wartości domyślnych — zawężenie byłoby udawaniem
// precyzji, której model nie ma.

function pomiar(over: Partial<RunMeasurement> = {}): RunMeasurement {
  return {
    caseId: "FDS-TEST",
    fileName: "test.fds",
    serverType: "cpx42",
    family: "cpx",
    cores: 8,
    mpiProcs: 8,
    meshCount: 8,
    totalCells: 500_000,
    stepsPerSec: 2,
    dtMean: 0.01,
    throughput: 300_000,
    reachedSimTime: 600,
    fdsHours: 4,
    minCellDim: 0.1,
    domainVolume: 1000,
    hrrpua: null,
    tEnd: 600,
    obstCount: 50,
    ...over,
  };
}

/** Zestaw biegów o zadanym rozrzucie czasu wokół tej samej konfiguracji. */
function zbior(godziny: number[]): RunMeasurement[] {
  return godziny.map((h, i) => pomiar({ caseId: `FDS-${i}`, fdsHours: h }));
}

describe("deriveCalibration — widełki", () => {
  it("przy garstce biegów zostaje przy wartościach domyślnych", () => {
    const cal = deriveCalibration(zbior([3, 4, 5]));
    expect(cal.spreadLo).toBe(DEFAULT_CALIBRATION.spreadLo);
    expect(cal.spreadHi).toBe(DEFAULT_CALIBRATION.spreadHi);
  });

  it("przy szerokim rozrzucie rozpycha pasmo poza wartości domyślne", () => {
    // Biegi od bardzo krótkich do bardzo długich przy tej samej konfiguracji —
    // model nie ma jak ich rozróżnić, więc pasmo musi być szerokie.
    const godziny = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.5);
    const cal = deriveCalibration(zbior(godziny));
    expect(cal.spreadHi).toBeGreaterThan(DEFAULT_CALIBRATION.spreadHi);
    expect(cal.spreadLo).toBeLessThan(DEFAULT_CALIBRATION.spreadLo);
  });

  it("nigdy nie zwęża pasma poniżej domyślnego", () => {
    // Wszystkie biegi identyczne => zmierzony rozrzut zerowy. Pasmo i tak ma
    // zostać co najmniej tak szerokie jak domyślne.
    const cal = deriveCalibration(zbior(new Array(40).fill(4)));
    expect(cal.spreadLo).toBeLessThanOrEqual(DEFAULT_CALIBRATION.spreadLo);
    expect(cal.spreadHi).toBeGreaterThanOrEqual(DEFAULT_CALIBRATION.spreadHi);
  });

  it("pasmo zawsze obejmuje jedność — prognoza trafiona musi się w nim mieścić", () => {
    const godziny = Array.from({ length: 30 }, (_, i) => 1 + (i % 9));
    const cal = deriveCalibration(zbior(godziny));
    expect(cal.spreadLo).toBeLessThanOrEqual(1);
    expect(cal.spreadHi).toBeGreaterThanOrEqual(1);
  });

  it("nie wywraca się na pustym zbiorze ani na zepsutych pomiarach", () => {
    expect(() => deriveCalibration([])).not.toThrow();
    const zepsute = [
      pomiar({ dtMean: 0 }),
      pomiar({ fdsHours: 0 }),
      pomiar({ mpiProcs: 0 }),
      pomiar({ totalCells: 0 }),
    ];
    expect(() => deriveCalibration(zepsute)).not.toThrow();
    const cal = deriveCalibration(zepsute);
    expect(Number.isFinite(cal.spreadLo)).toBe(true);
    expect(Number.isFinite(cal.spreadHi)).toBe(true);
  });

  it("trzyma pasmo w rozsądnych granicach mimo skrajnych odstających", () => {
    const godziny = [...new Array(38).fill(4), 0.0001, 100_000];
    const cal = deriveCalibration(zbior(godziny));
    expect(cal.spreadLo).toBeGreaterThan(0);
    expect(cal.spreadHi).toBeLessThanOrEqual(10);
  });
});

describe("deriveCalibration — pozostałe pola", () => {
  it("zawsze oddaje komplet rodzin maszyn", () => {
    const cal = deriveCalibration(zbior([4, 4, 4]));
    for (const rodzina of ["cpx", "cx", "ccx"] as const) {
      expect(cal.perf[rodzina].throughput).toBeGreaterThan(0);
    }
  });

  it("niesie model kroku czasowego i znacznik czasu", () => {
    const cal = deriveCalibration(zbior([4, 4, 4]));
    expect(cal.timestep).toBeDefined();
    expect(["learned", "cfl"]).toContain(cal.timestep.kind);
    expect(cal.updatedAt).not.toBeNull();
  });
});
