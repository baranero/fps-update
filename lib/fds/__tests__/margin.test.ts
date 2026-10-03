import { describe, expect, it } from "vitest";
import {
  SIZE_BUCKETS,
  priceAtCurrentTariff,
  rowCost,
  summarizeMargin,
  type MarginRow,
} from "@/lib/fds/margin";
import { EUR_PLN } from "@/lib/fds/pricing";
import { getSpec } from "@/lib/hetzner/catalog";

function row(over: Partial<MarginRow> = {}): MarginRow {
  return {
    status: "done",
    server_type: "cpx42",
    dispatched_at: "2026-09-01T10:00:00.000Z",
    completed_at: "2026-09-01T20:00:00.000Z", // 10 h
    price: 100,
    total_cells: 500_000,
    t_end: 1500,
    ...over,
  };
}

describe("rowCost", () => {
  it("liczy koszt z realnego czasu życia maszyny", () => {
    const c = rowCost(row())!;
    expect(c.serverHours).toBeCloseTo(10, 6);
    expect(c.cloudEur).toBeCloseTo(10 * getSpec("cpx42")!.eurPerHour, 6);
    expect(c.costPln).toBeCloseTo(c.rawEur * EUR_PLN, 6);
  });

  it("dolicza magazyn do kosztu", () => {
    const c = rowCost(row())!;
    expect(c.storageEur).toBeGreaterThan(0);
    expect(c.rawEur).toBeCloseTo(c.cloudEur + c.storageEur, 9);
  });

  // Zaniżony koszt maszyny raz już kosztował FDSRun 6-krotnie zaniżoną wycenę —
  // lepiej nie policzyć wiersza niż policzyć go po cenie zmyślonej.
  it("nie zgaduje kosztu przy nieznanej maszynie ani bez znaczników czasu", () => {
    expect(rowCost(row({ server_type: "nie-ma-takiej" }))).toBeNull();
    expect(rowCost(row({ server_type: null }))).toBeNull();
    expect(rowCost(row({ dispatched_at: null }))).toBeNull();
    expect(rowCost(row({ completed_at: null }))).toBeNull();
  });

  it("odrzuca ujemny i zerowy czas życia (przestawione znaczniki)", () => {
    expect(rowCost(row({ completed_at: "2026-09-01T09:00:00.000Z" }))).toBeNull();
    expect(rowCost(row({ completed_at: "2026-09-01T10:00:00.000Z" }))).toBeNull();
  });

  it("droższa maszyna to wyższy koszt przy tym samym czasie", () => {
    expect(rowCost(row({ server_type: "ccx63" }))!.rawEur)
      .toBeGreaterThan(rowCost(row({ server_type: "cx23" }))!.rawEur);
  });
});

describe("summarizeMargin", () => {
  it("liczy przychód, koszt i krotność zleceń zafakturowanych", () => {
    const s = summarizeMargin([row({ price: 100 }), row({ price: 200 })]);
    expect(s.revenue).toBe(300);
    expect(s.billedJobs).toBe(2);
    expect(s.multiplier).toBeCloseTo(300 / s.costBilled, 6);
  });

  // Sedno modułu: bieg zakończony błędem kosztuje tyle samo co udany,
  // ale nie ma po nim przychodu. Panel musi pokazywać obie krotności.
  it("koszt biegów błędnych obniża krotność realną, nie cennikową", () => {
    const s = summarizeMargin([
      row({ status: "done", price: 100 }),
      row({ status: "failed", price: null }),
    ]);
    expect(s.burnedJobs).toBe(1);
    expect(s.costBurned).toBeGreaterThan(0);
    expect(s.multiplier).toBeGreaterThan(s.realizedMultiplier);
    expect(s.realizedMultiplier).toBeCloseTo(100 / (s.costBilled + s.costBurned), 6);
    expect(s.burnShare).toBeCloseTo(0.5, 2);
  });

  it("zysk brutto liczy po koszcie całkowitym, razem ze spalonym", () => {
    const s = summarizeMargin([
      row({ status: "done", price: 100 }),
      row({ status: "failed", price: null }),
    ]);
    expect(s.margin).toBeCloseTo(100 - s.costBilled - s.costBurned, 6);
  });

  it("anulowane zlecenie z maszyną też liczy się jako koszt spalony", () => {
    const s = summarizeMargin([row({ status: "cancelled", price: null })]);
    expect(s.burnedJobs).toBe(1);
    expect(s.revenue).toBe(0);
  });

  it("pomija zlecenia bez maszyny — nie zakłamują ani kosztu, ani przychodu", () => {
    const s = summarizeMargin([
      row({ status: "pending", dispatched_at: null, price: null }),
      row({ status: "done", price: 100 }),
    ]);
    expect(s.billedJobs).toBe(1);
    expect(s.burnedJobs).toBe(0);
  });

  it("pusty zestaw nie wywraca się na dzieleniu przez zero", () => {
    const s = summarizeMargin([]);
    expect(s.multiplier).toBe(0);
    expect(s.realizedMultiplier).toBe(0);
    expect(s.buckets).toEqual([]);
  });

  it("rozbija wynik po wielkości modelu i pomija puste przedziały", () => {
    const s = summarizeMargin([
      row({ total_cells: 20_000, price: 5 }),
      row({ total_cells: 1_200_000, price: 300 }),
    ]);
    expect(s.buckets.map((b) => b.key)).toEqual(["xs", "lg"]);
    for (const b of s.buckets) {
      expect(b.margin).toBeCloseTo(b.revenue - b.cost, 6);
      expect(b.multiplier).toBeCloseTo(b.revenue / b.cost, 6);
    }
  });

  it("przedziały wielkości pokrywają całą oś bez dziur", () => {
    for (let i = 1; i < SIZE_BUCKETS.length; i++) {
      expect(SIZE_BUCKETS[i].min).toBe(SIZE_BUCKETS[i - 1].max);
    }
    expect(SIZE_BUCKETS[0].min).toBe(0);
    expect(SIZE_BUCKETS.at(-1)!.max).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("priceAtCurrentTariff", () => {
  it("wycenia stare zlecenie wg obowiązującego cennika", () => {
    const p = priceAtCurrentTariff(row())!;
    const cost = rowCost(row())!;
    expect(p).toBeGreaterThan(cost.costPln);
    // Marża nigdy nie schodzi poniżej minimum z cennika.
    expect(p / cost.costPln).toBeGreaterThan(3.7);
  });

  it("bez maszyny nie ma czego wyceniać", () => {
    expect(priceAtCurrentTariff(row({ dispatched_at: null }))).toBeNull();
  });
});
