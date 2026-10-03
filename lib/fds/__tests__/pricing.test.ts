import { describe, expect, it } from "vitest";
import {
  EUR_PLN,
  OVERHEAD_H,
  STORAGE_EUR_PER_GB,
  MARKUP_RANGE,
  computeFinalPrice,
  estimateOutputGb,
  markupPercent,
  priceBreakdown,
  priceFromCost,
  progressiveMarkup,
} from "@/lib/fds/pricing";
import { getSpec } from "@/lib/hetzner/catalog";

// Ten plik pilnuje cennika. Stawki wolno zmieniać świadomie — wtedy poprawia się
// też liczby tutaj. Testy istnieją po to, żeby zmiana NIEświadoma (refaktor,
// przestawiona stała, pomylony rząd wielkości) zapaliła się na czerwono, zanim
// zlecenia zaczną wyceniać się kilkukrotnie za tanio albo za drogo.

describe("progressiveMarkup", () => {
  it("trzyma 6x na zleceniach drobnych i 3,8x na duzych", () => {
    expect(progressiveMarkup(0.01)).toBe(MARKUP_RANGE.max);
    expect(progressiveMarkup(0.05)).toBe(MARKUP_RANGE.max);
    expect(progressiveMarkup(8)).toBe(MARKUP_RANGE.min);
    expect(progressiveMarkup(50)).toBe(MARKUP_RANGE.min);
  });

  it("maleje monotonicznie miedzy progami - bez skoku na granicy", () => {
    const samples = [0.05, 0.1, 0.3, 0.8, 1.5, 3, 8];
    const markups = samples.map(progressiveMarkup);
    for (let i = 1; i < markups.length; i++) {
      expect(markups[i]).toBeLessThan(markups[i - 1]);
    }
    expect(markups.at(-1)).toBeCloseTo(MARKUP_RANGE.min, 6);
  });

  it("nigdy nie schodzi ponizej marzy minimalnej", () => {
    for (const cost of [0, 0.001, 0.049, 7.999, 1000]) {
      expect(progressiveMarkup(cost)).toBeGreaterThanOrEqual(MARKUP_RANGE.min);
      expect(progressiveMarkup(cost)).toBeLessThanOrEqual(MARKUP_RANGE.max);
    }
  });

  // To jest CEL BIZNESOWY cennika, nie szczegol implementacji: wlasciciel chce
  // narzutu ok. 300% w skali portfela. Portfel jest wazony kosztem, wiec o
  // wyniku decyduje marza duzych zlecen. Zmiana, ktora wywala ten test,
  // przestawia realna marze firmy - popraw swiadomie albo cofnij.
  it("na typowym rozkladzie zlecen daje narzut ok. 300%", () => {
    // Surowe koszty [EUR] 99 zakonczonych biegow - kwartyle rzeczywistej historii.
    const portfolio = [0.004, 0.02, 0.05, 0.1, 0.3, 1.17, 3, 5.5, 8, 12, 29];
    const cost = portfolio.reduce((a, c) => a + c, 0);
    const revenue = portfolio.reduce((a, c) => a + c * progressiveMarkup(c), 0);
    expect(revenue / cost).toBeGreaterThan(3.6);
    expect(revenue / cost).toBeLessThan(4.4);
  });

  it("drobne zlecenie ma wyzsza marze niz duze", () => {
    expect(progressiveMarkup(0.02)).toBeGreaterThan(progressiveMarkup(1.17));
    expect(progressiveMarkup(1.17)).toBeGreaterThan(progressiveMarkup(20));
  });
});

describe("markupPercent", () => {
  it("podaje narzut, nie krotnosc - 4x to 300%", () => {
    expect(markupPercent(0.05)).toBeCloseTo((MARKUP_RANGE.max - 1) * 100, 6);
    expect(markupPercent(8)).toBeCloseTo((MARKUP_RANGE.min - 1) * 100, 6);
  });
});

describe("priceBreakdown", () => {
  it("rozbija cene na koszt, marze i zysk - sumy sie zgadzaja", () => {
    const b = priceBreakdown(0.6, 0.4);
    expect(b.rawCostEur).toBeCloseTo(1, 6);
    expect(b.rawCostPln).toBeCloseTo(1 * EUR_PLN, 6);
    expect(b.price).toBe(priceFromCost(0.6, 0.4));
    expect(b.margin).toBeCloseTo(b.price - b.rawCostPln, 6);
    expect(b.markup).toBeCloseTo(progressiveMarkup(1), 6);
  });

  it("zysk na zleceniu jest dodatni w calym zakresie kosztow", () => {
    for (const cost of [0.01, 0.05, 0.5, 5, 50]) {
      expect(priceBreakdown(cost, 0).margin).toBeGreaterThan(0);
    }
  });
});

describe("priceFromCost", () => {
  it("mnozy surowy koszt przez marze i kurs", () => {
    const raw = 1;
    const expected = Math.round(raw * progressiveMarkup(raw) * EUR_PLN * 100) / 100;
    expect(priceFromCost(0.6, 0.4)).toBe(expected);
  });

  // Decyzja wlasciciela: zadnej sztucznej ceny minimalnej. Drobne zlecenie ma
  // kosztowac tyle, ile wynika z marzy - grosz jest jedynym ograniczeniem,
  // bo mniejszej kwoty nie da sie zafakturowac.
  it("nie ma podlogi cenowej poza groszem", () => {
    expect(priceFromCost(0, 0)).toBe(0.01);
    expect(priceFromCost(1e-9, 0)).toBe(0.01);
    // Kilkugroszowy koszt daje kilkunastogroszowa cene, a nie zaokraglona zlotowke.
    expect(priceFromCost(0.01, 0)).toBeLessThan(1);
    expect(priceFromCost(0.01, 0)).toBeGreaterThan(0.01);
  });

  it("rosnie wraz z kosztem", () => {
    const prices = [0.02, 0.2, 1, 5, 20].map((c) => priceFromCost(c, 0));
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });

  it("nie przyjmuje ujemnego kosztu jako rabatu", () => {
    expect(priceFromCost(-5, 0)).toBe(0.01);
    expect(priceFromCost(1, -100)).toBe(priceFromCost(1, 0));
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
    expect(price).toBeGreaterThan(0);
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
