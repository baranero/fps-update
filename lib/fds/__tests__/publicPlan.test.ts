import { describe, expect, it } from "vitest";
import { findPlanById, planId, toPublicPlan, type PublicPlan } from "@/lib/fds/publicPlan";
import { planRuns, type PlanInput, type RunPlan } from "@/lib/fds/planner";

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    meshCount: 8,
    meshCells: Array(8).fill(64_000),
    totalCells: 512_000,
    tEnd: 900,
    minCellDim: 0.1,
    domainVolume: 512,
    ompThreads: 1,
    forcedProcs: null,
    ...over,
  };
}

const result = planRuns(input());
const plan: RunPlan = result.balanced!;

describe("toPublicPlan", () => {
  // Endpoint doboru maszyny jest PUBLICZNY. Każde pole, które tu przepuścimy,
  // jest jawne dla każdego, kto otworzy narzędzia deweloperskie — a z kosztu
  // maszyny i ceny wylicza się naszą marżę jednym dzieleniem.
  it("nie przepuszcza ANI JEDNEGO pola opisującego nasz koszt", () => {
    const pub = toPublicPlan(plan) as unknown as Record<string, unknown>;
    for (const forbidden of ["cloudCostEur", "storageCostEur", "billedHours", "estimatedOutputGb", "maxLoadCells"]) {
      expect(pub[forbidden]).toBeUndefined();
    }
  });

  it("nie przepuszcza symbolu maszyny dostawcy", () => {
    const pub = toPublicPlan(plan) as unknown as Record<string, unknown>;
    expect(pub.serverType).toBeUndefined();
    expect(pub.family).toBeUndefined();
    // Symbol nie może się też przemycić w identyfikatorze.
    expect(JSON.stringify(pub).toLowerCase()).not.toContain(plan.serverType.toLowerCase());
  });

  // Czujka na przyszłość: gdy ktoś dopisze do RunPlan nowe pole kosztowe
  // i bezmyślnie przepisze je do DTO, ten test zapali się na czerwono.
  it("wypuszcza wyłącznie pola z zamkniętej listy", () => {
    const allowed = new Set<keyof PublicPlan>([
      "id", "cores", "ramGb", "dedicated", "mpiProcs", "meshesPerProc",
      "wallHours", "wallLoHours", "wallHiHours", "price", "tier", "warnings",
    ]);
    for (const key of Object.keys(toPublicPlan(plan))) {
      expect(allowed.has(key as keyof PublicPlan)).toBe(true);
    }
  });

  it("zostawia wszystko, czego kreator potrzebuje do wyboru", () => {
    const pub = toPublicPlan(plan);
    expect(pub.price).toBeGreaterThan(0);
    expect(pub.wallHours).toBeGreaterThan(0);
    expect(pub.cores).toBeGreaterThan(0);
    expect(pub.ramGb).toBeGreaterThan(0);
    expect(pub.wallLoHours).toBeLessThanOrEqual(pub.wallHours);
    expect(pub.wallHiHours).toBeGreaterThanOrEqual(pub.wallHours);
  });
});

describe("planId", () => {
  it("jest stabilny między wywołaniami — inaczej wybór klienta przepadałby przy składaniu zlecenia", () => {
    expect(planId("cpx42")).toBe(planId("cpx42"));
  });

  it("nie rozróżnia wielkości liter w symbolu", () => {
    expect(planId("CPX42")).toBe(planId("cpx42"));
  });

  it("różne maszyny mają różne identyfikatory", () => {
    const ids = new Set(result.allPlans.map((p) => planId(p.serverType)));
    expect(ids.size).toBe(result.allPlans.length);
  });

  it("nie zawiera symbolu maszyny ani niczego czytelnego", () => {
    expect(planId("cpx42")).toMatch(/^[0-9a-f]{12}$/);
    expect(planId("cpx42")).not.toContain("cpx");
  });
});

describe("findPlanById", () => {
  it("odnajduje wariant po identyfikatorze", () => {
    expect(findPlanById(result, planId(plan.serverType))?.serverType).toBe(plan.serverType);
  });

  it("szuka w pełnej liście, nie tylko na froncie Pareto", () => {
    const dominated = result.allPlans.find((p) => !result.plans.includes(p));
    if (dominated) {
      expect(findPlanById(result, planId(dominated.serverType))?.serverType).toBe(dominated.serverType);
    }
  });

  // Stara karta w przeglądarce albo zmiana oferty dostawcy — wywołujący ma
  // wtedy spaść na wariant domyślny, a nie wywrócić zamówienie.
  it("nieznany albo pusty identyfikator daje null", () => {
    expect(findPlanById(result, "deadbeefdead")).toBeNull();
    expect(findPlanById(result, null)).toBeNull();
    expect(findPlanById(result, "")).toBeNull();
  });

  it("znosi wielkość liter i spacje wokół", () => {
    const id = planId(plan.serverType);
    expect(findPlanById(result, ` ${id.toUpperCase()} `)?.serverType).toBe(plan.serverType);
  });
});
