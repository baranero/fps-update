import { describe, expect, it } from "vitest";
import {
  MESH_OVERHEAD_CELLS,
  effectiveProcLoad,
  effectiveVelocity,
  findPlan,
  planRuns,
  type PlanInput,
} from "@/lib/fds/planner";

// Planer decyduje, na czym i jak długo policzy się zlecenie — czyli ile ono
// kosztuje. Testy trzymają własności, które wynikają z kalibracji na realnych
// biegach FDS i które łatwo zepsuć przy refaktorze, bo żadna z nich nie jest
// widoczna w sygnaturze funkcji.

/** Model odniesienia: 12 równych siatek, ~1,2 mln komórek. */
function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    meshCount: 12,
    meshCells: new Array(12).fill(100_000),
    totalCells: 1_200_000,
    tEnd: 600,
    minCellDim: 0.1,
    domainVolume: 1200,
    ompThreads: 1,
    forcedProcs: null,
    ...over,
  };
}

describe("effectiveVelocity", () => {
  it("odtwarza pomiary z biegów FDSRun w granicach ±10%", () => {
    // L = 2,5 m → V_real 5,6…5,9 m/s  (objętość ≈ L³)
    expect(effectiveVelocity(2.5 ** 3)).toBeGreaterThan(5.0);
    expect(effectiveVelocity(2.5 ** 3)).toBeLessThan(6.5);

    // L = 11,4 m → V_real 10,1…13,3 m/s
    const duza = effectiveVelocity(11.4 ** 3);
    expect(duza).toBeGreaterThan(8.5);
    expect(duza).toBeLessThan(14);
  });

  it("rośnie ze skalą modelu, ale zostaje w widełkach 4…20 m/s", () => {
    expect(effectiveVelocity(1e-9)).toBeGreaterThanOrEqual(4);
    expect(effectiveVelocity(1e12)).toBeLessThanOrEqual(20);
    expect(effectiveVelocity(10_000)).toBeGreaterThan(effectiveVelocity(10));
  });
});

describe("effectiveProcLoad", () => {
  it("dolicza stały narzut na każdą siatkę obsługiwaną przez proces", () => {
    // 12 siatek na 1 procesie: komórki + 12 × narzut
    expect(effectiveProcLoad(120_000, 12, 1)).toBe(120_000 + MESH_OVERHEAD_CELLS * 12);
  });

  it("przy modelu pociętym na drobno narzut dominuje nad komórkami", () => {
    // Bieg kalibracyjny: 12 siatek po 333 komórki na jednym procesie.
    // Bez składnika narzutu prognoza była ~4× zbyt optymistyczna.
    const zNarzutem = effectiveProcLoad(4_000, 12, 1);
    const bezNarzutu = 4_000;
    expect(zNarzutem / bezNarzutu).toBeGreaterThan(3);
  });

  it("przy dużych siatkach narzut jest poprawką rzędu procentów", () => {
    const zNarzutem = effectiveProcLoad(1_000_000, 10, 10);
    expect(zNarzutem / 100_000).toBeLessThan(1.02);
  });
});

describe("planRuns", () => {
  it("zwraca front Pareto — żaden wariant nie jest bity na obu osiach naraz", () => {
    const { plans } = planRuns(input());
    expect(plans.length).toBeGreaterThan(0);
    for (const a of plans) {
      const zdominowany = plans.some(
        (b) => b !== a && b.price <= a.price && b.wallHours <= a.wallHours &&
               (b.price < a.price || b.wallHours < a.wallHours)
      );
      expect(zdominowany).toBe(false);
    }
  });

  it("wyznacza trzy kafle, a najtańszy nie jest droższy od najszybszego", () => {
    const { eco, balanced, fast } = planRuns(input());
    expect(eco).not.toBeNull();
    expect(balanced).not.toBeNull();
    expect(fast).not.toBeNull();
    expect(eco!.price).toBeLessThanOrEqual(fast!.price);
    expect(fast!.wallHours).toBeLessThanOrEqual(eco!.wallHours);
  });

  it("tryb ekonomiczny potrafi dać mniej procesów niż siatek", () => {
    // Rdzeń oferty „taniej, ale dłużej": FDS rozdziela siatki między procesy.
    const { allPlans } = planRuns(input());
    expect(allPlans.some((p) => p.mpiProcs < 12 && p.meshesPerProc > 1)).toBe(true);
  });

  it("dłuższa symulacja nigdy nie jest tańsza od krótszej", () => {
    const krotka = planRuns(input({ tEnd: 300 })).eco!;
    const dluga = planRuns(input({ tEnd: 3600 })).eco!;
    expect(dluga.wallHours).toBeGreaterThan(krotka.wallHours);
    expect(dluga.price).toBeGreaterThanOrEqual(krotka.price);
  });

  it("szanuje sztywne przypisanie procesów z pliku (MPI_PROCESS)", () => {
    const { allPlans } = planRuns(input({ forcedProcs: 4 }));
    expect(allPlans.length).toBeGreaterThan(0);
    for (const p of allPlans) expect(p.mpiProcs).toBe(4);
  });

  it("zgłasza brak maszyny zamiast milczeć, gdy model nie mieści się w RAM", () => {
    const wynik = planRuns(input({ totalCells: 5_000_000_000, meshCells: [5_000_000_000], meshCount: 1 }));
    expect(wynik.plans).toEqual([]);
    expect(wynik.blocked).toBe("ramTooSmall");
  });

  it("zawęża wybór do maszyn faktycznie dostępnych u dostawcy", () => {
    const { allPlans } = planRuns(input(), { availableTypes: ["cpx42", "cpx62"] });
    expect(allPlans.length).toBeGreaterThan(0);
    for (const p of allPlans) expect(["cpx42", "cpx62"]).toContain(p.serverType);
  });

  it("przyjmuje żywe ceny dostawcy zamiast zapasowych z katalogu", () => {
    const zapasowe = planRuns(input(), { availableTypes: ["cpx42"] }).allPlans[0];
    const drozsze = planRuns(input(), { availableTypes: ["cpx42"], prices: { cpx42: 10 } }).allPlans[0];
    expect(drozsze.price).toBeGreaterThan(zapasowe.price);
  });

  it("zakłada rozmiar komórki, gdy plik go nie podaje — i mówi o tym wprost", () => {
    expect(planRuns(input({ minCellDim: null })).cellDimSource).toBe("assumed");
    expect(planRuns(input()).cellDimSource).toBe("file");
  });

  it("krok czasowy mieści się w granicach modelu CFL", () => {
    const { dtEstimate, steps } = planRuns(input());
    expect(dtEstimate).toBeGreaterThanOrEqual(0.001);
    expect(dtEstimate).toBeLessThanOrEqual(0.5);
    expect(steps).toBeGreaterThan(0);
  });

  it("nie wywraca się na modelu bez czasu końcowego", () => {
    expect(() => planRuns(input({ tEnd: null }))).not.toThrow();
    expect(planRuns(input({ tEnd: null })).plans.length).toBeGreaterThan(0);
  });
});

describe("findPlan", () => {
  it("znajduje wariant po typie maszyny, także spoza frontu Pareto", () => {
    const wynik = planRuns(input());
    const typ = wynik.allPlans.at(-1)!.serverType;
    expect(findPlan(wynik, typ)?.serverType).toBe(typ);
    expect(findPlan(wynik, typ.toUpperCase())?.serverType).toBe(typ);
  });

  it("oddaje null dla braku wyboru i dla typu spoza listy", () => {
    const wynik = planRuns(input());
    expect(findPlan(wynik, null)).toBeNull();
    expect(findPlan(wynik, "nie-ma-takiej")).toBeNull();
  });
});
