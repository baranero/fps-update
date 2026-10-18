import { describe, expect, it } from "vitest";
import {
  analyze, classifySeries, DEFAULT_PARAMS, normCdf, realTransmission, uncertaintyThresholds,
} from "../analysis";
import type { FdsCsvData } from "../devc";

// Przebieg w kształcie z raportu CNBOP (scenariusz K-izoterma): czysto do 50 s,
// spadek do ~48 %/m przed aktywacją w 360 s, powolny powrót. Tor „wzdłuż”
// wraca do 95 %/m w 1038 s, tor „poprzek” w 1280 s.
function track(reachAt: number): number[] {
  const out: number[] = [];
  for (let t = 0; t <= 1500; t += 2) {
    if (t < 50) out.push(100);
    else if (t <= 360) out.push(100 - (52 * (t - 50)) / 310);
    else if (t < reachAt) out.push(48 + (47 * (t - 360)) / (reachAt - 360) - 0.01);
    else out.push(Math.min(100, 95 + (t - reachAt) / 100));
  }
  return out;
}

const time = Array.from({ length: 751 }, (_, i) => i * 2);
const devc: FdsCsvData = {
  time,
  series: [
    { name: "TR_WZDLUZ", unit: "%/m", values: track(1038) },
    { name: "TR_POPRZEK", unit: "%/m", values: track(1280) },
    { name: "TR_PARTER", unit: "%/m", values: time.map(() => 99.5) },
    { name: "Q_KLAPY", unit: "m3/s", values: time.map((t) => (t < 360 ? 0 : 0.79)) },
    { name: "TEMP", unit: "C", values: time.map(() => 20) },
  ],
};
const hrr: FdsCsvData = {
  time,
  series: [{ name: "HRR", unit: "kW", values: time.map((t) => (t < 15 ? (63.6 * t) / 15 : t <= 285 ? 63.6 : t <= 300 ? 63.6 * (300 - t) / 15 : 0)) }],
};

describe("classifySeries", () => {
  it("rozpoznaje wielkość z QUANTITY, jednostki i nazwy", () => {
    expect(classifySeries("X", "%/m", [100], "TRANSMISSION")).toBe("transmission");
    expect(classifySeries("X", "%", [0], "PATH OBSCURATION")).toBe("obscuration");
    expect(classifySeries("X", "m3/s", [0], null)).toBe("flow");
    expect(classifySeries("ZACIEM_1", "%/m", [0], null)).toBe("obscuration");
    expect(classifySeries("BEAM", "%/m", [0], null)).toBe("obscuration");
    expect(classifySeries("BEAM", "%/m", [100], null)).toBe("transmission");
    expect(classifySeries("TC", "C", [20], null)).toBe("other");
  });
});

describe("analyze — punkt pomiarowy", () => {
  const a = analyze(devc, hrr, null, DEFAULT_PARAMS, ["TR_WZDLUZ", "TR_POPRZEK"]);

  it("miarodajny jest późniejszy tor, t_odd liczony od aktywacji", () => {
    const w = a.transmission.find((r) => r.id === "TR_WZDLUZ")!;
    const p = a.transmission.find((r) => r.id === "TR_POPRZEK")!;
    expect(w.reach).toBe(1038);
    expect(p.reach).toBe(1280);
    expect(a.point.reach).toBe(1280);
    expect(a.point.tOdd).toBe(920);
  });

  it("opisuje minimum i okres poniżej progu", () => {
    const w = a.transmission.find((r) => r.id === "TR_WZDLUZ")!;
    expect(w.min!.value).toBeCloseTo(48, 0);
    expect(w.below).toHaveLength(1);
    expect(w.below[0].to).toBe(1038);
    expect(w.reachStable).toBe(1038);
  });

  it("tor czysty przez cały czas nie ma czasu osiągnięcia", () => {
    expect(a.transmission.find((r) => r.id === "TR_PARTER")!.reach).toBe("never_below");
  });

  it("strumień: średnia i objętość po aktywacji", () => {
    expect(a.flows).toHaveLength(1);
    expect(a.flows[0].meanAfter).toBeCloseTo(0.79, 3);
    expect(a.flows[0].volumeAfter).toBeCloseTo(0.79 * 1140, 0);
  });

  it("HRR: maksimum, faza ustalona, energia", () => {
    expect(a.hrr!.max.value).toBeCloseTo(63.6, 1);
    expect(a.hrr!.plateau).toBeCloseTo(63.6, 0);
    // 63,6 kW × (285 − 15 + 15) s ≈ 18,1 MJ
    expect(a.hrr!.energyMJ).toBeCloseTo(18.1, 0);
  });

  it("niepewność: im ostrzejszy próg w modelu, tym później", () => {
    const [exp, crit, conf] = a.uncertainty;
    expect(exp.key).toBe("expected");
    expect(exp.reach!).toBeLessThan(crit.reach!);
    expect(conf.reach!).toBeGreaterThan(crit.reach!);
  });
});

describe("niepewność wg Validation Guide (δ = 1,24, σ̃ = 26%)", () => {
  it("odtwarza progi z raportu: 93,8 / 95 / 95,9 %/m i pewność ~82%", () => {
    const th = uncertaintyThresholds(DEFAULT_PARAMS);
    expect(th.expected).toBeCloseTo(93.8, 1);
    expect(th.conf2s).toBeCloseTo(95.9, 1);
    expect(th.criterionConfidence).toBeCloseTo(0.82, 2);
  });

  it("wynik modelu 91 %/m ≈ rzeczywiste 92,7 ± 1,9 %/m", () => {
    const r = realTransmission(91, DEFAULT_PARAMS);
    expect(r.mean).toBeCloseTo(92.7, 1);
    expect(r.sd).toBeCloseTo(1.9, 1);
  });

  it("normCdf", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(2)).toBeCloseTo(0.977, 3);
    expect(normCdf(-1)).toBeCloseTo(0.159, 3);
  });
});

describe("obscuration (zaciemnienie) liczone jako dopełnienie", () => {
  it("5% zaciemnienia = 95% transmitancji", () => {
    const d: FdsCsvData = {
      time: [0, 100, 400, 600, 700],
      series: [{ name: "ZACIEM", unit: "%/m", values: [0, 40, 20, 5, 1] }],
    };
    const a = analyze(d, null, null, DEFAULT_PARAMS, ["ZACIEM"]);
    expect(a.point.reach).toBe(600);
    expect(a.point.tOdd).toBe(240);
  });
});
