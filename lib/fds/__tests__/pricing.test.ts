import { describe, expect, it } from "vitest";
import {
  EUR_PLN,
  OVERHEAD_H,
  STORAGE_EUR_PER_GB,
  computeFinalPrice,
  estimateOutputGb,
  priceFromCost,
  progressiveMarkup,
} from "@/lib/fds/pricing";
import { getSpec } from "@/lib/hetzner/catalog";

// Ten plik pilnuje cennika. Stawki wolno zmieniać świadomie — wtedy poprawia się
// też liczby tutaj. Testy istnieją po to, żeby zmiana NIEświadoma (refaktor,
// przestawiona stała, pomylony rząd wielkości) zapaliła się na czerwono, zanim
// zlecenia zaczną wyceniać się kilkukrotnie za tanio albo za drogo.

describe("progressiveMarkup", () => {
  it("trzyma 25× na drobnych zleceniach i 10× na dużych", () => {
    expect(progressiveMarkup(0.01)).toBe(25);
    expect(progressiveMarkup(0.05)).toBe(25);
    expect(progressiveMarkup(3)).toBe(10);
    expect(progressiveMarkup(50)).toBe(10);
  });

  it("maleje monotonicznie między progami — bez skoku na granicy", () => {
    const samples = [0.05, 0.1, 0.3, 0.8, 1.5, 3];
    const markups = samples.map(progressiveMarkup);
    for (let i = 1; i < markups.length; i++) {
      expect(markups[i]).toBeLessThan(markups[i - 1]);
    }
    expect(markups.at(-1)).toBeCloseTo(10, 6);
  });

  it("nigdy nie schodzi poniżej marży minimalnej", () => {
    for (const cost of [0, 0.001, 0.049, 2.999, 1000]) {
      expect(progressiveMarkup(cost)).toBeGreaterThanOrEqual(10);
      expect(progressiveMarkup(cost)).toBeLessThanOrEqual(25);
    }
  });
});

describe("priceFromCost", () => {
  it("mnoży surowy koszt przez marżę i kurs", () => {
    // 1 EUR kosztu → marża log-interpolowana, przeliczona po EUR_PLN
    const raw = 1;
    const expected = Math.round(raw * progressiveMarkup(raw) * EUR_PLN);
    expect(priceFromCost(0.6, 0.4)).toBe(expected);
  });

  it("nigdy nie oddaje zera — najtańsze zlecenie to 1 zł", () => {
    expect(priceFromCost(0, 0)).toBe(1);
    expect(priceFromCost(1e-9, 0)).toBe(1);
  });

  it("rośnie wraz z kosztem", () => {
    const prices = [0.02, 0.2, 1, 5, 20].map((c) => priceFromCost(c, 0));
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });
});

describe("computeFinalPrice", () => {
  it("dolicza 3 min narzutu na wysyłkę wyników i usunięcie maszyny", () => {
    const spec = getSpec("cpx42")!;
    // Godzina pracy rozlicza się jak 1 h 3 min — narzut jest doliczany, nie gubiony.
    expect(computeFinalPrice({ serverType: "cpx42", serverHours: 1, storageGb: 0 }))
      .toBe(priceFromCost((1 + 3 / 60) * spec.eurPerHour, 0));
  });

  it("nie rozlicza czasu krótszego niż minuta jako zera", () => {
    const price = computeFinalPrice({ serverType: "cpx42", serverHours: 0, storageGb: 0 });
    expect(price).toBeGreaterThanOrEqual(1);
  });

  it("nie daje ujemnej ceny przy ujemnym rozmiarze wyników", () => {
    expect(computeFinalPrice({ serverType: "cpx42", serverHours: 1, storageGb: -5 }))
      .toBe(computeFinalPrice({ serverType: "cpx42", serverHours: 1, storageGb: 0 }));
  });

  it("wraca do maszyny zapasowej przy nieznanym typie", () => {
    const nieznany = computeFinalPrice({ serverType: "nie-ma-takiej", serverHours: 2, storageGb: 1 });
    const zapasowa = computeFinalPrice({ serverType: "cpx42", serverHours: 2, storageGb: 1 });
    expect(nieznany).toBe(zapasowa);
  });

  it("droższa maszyna daje wyższą cenę przy tym samym czasie", () => {
    const tania = computeFinalPrice({ serverType: "cx23", serverHours: 5, storageGb: 2 });
    const droga = computeFinalPrice({ serverType: "ccx63", serverHours: 5, storageGb: 2 });
    expect(droga).toBeGreaterThan(tania);
  });

  it("magazyn realnie podbija cenę", () => {
    const bez = computeFinalPrice({ serverType: "cpx42", serverHours: 3, storageGb: 0 });
    const z100gb = computeFinalPrice({ serverType: "cpx42", serverHours: 3, storageGb: 100 });
    expect(z100gb).toBeGreaterThan(bez);
    // 100 GB × stawka to realny koszt, nie zaokrąglenie
    expect(100 * STORAGE_EUR_PER_GB).toBeGreaterThan(0.5);
  });
});

describe("estimateOutputGb", () => {
  it("rośnie z liczbą komórek i czasem symulacji", () => {
    const a = estimateOutputGb(1_000_000, 600);
    const b = estimateOutputGb(2_000_000, 600);
    const c = estimateOutputGb(1_000_000, 1200);
    expect(b).toBeCloseTo(2 * a, 6);
    expect(c).toBeCloseTo(2 * a, 6);
  });

  it("ma podłogę — nawet mikromodel zajmuje miejsce", () => {
    expect(estimateOutputGb(1, 1)).toBe(0.05);
  });
});

describe("stałe cennika", () => {
  it("są w spodziewanym rzędzie wielkości", () => {
    // Czujka na literówkę w rzędzie wielkości (0,31 zamiast 0,031 itd.)
    expect(EUR_PLN).toBeGreaterThan(3.5);
    expect(EUR_PLN).toBeLessThan(6);
    expect(STORAGE_EUR_PER_GB).toBeGreaterThan(0.001);
    expect(STORAGE_EUR_PER_GB).toBeLessThan(0.2);
    expect(OVERHEAD_H).toBeGreaterThan(0);
    expect(OVERHEAD_H).toBeLessThan(1);
  });
});
