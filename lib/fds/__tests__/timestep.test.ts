import { describe, expect, it } from "vitest";
import {
  CFL_MODEL,
  DT_MAX,
  DT_MIN,
  MIN_SAMPLES,
  TIMESTEP_TERMS,
  cflTimestep,
  effectiveVelocity,
  featureVector,
  fitTimestepModel,
  predictTimestep,
  typicalErrorFactor,
  type TimestepFeatures,
  type TimestepSample,
} from "@/lib/fds/timestep";

// Model kroku czasowego decyduje o prognozie czasu, a przez nią o cenie.
// Testy pilnują trzech rzeczy: że regresja odtwarza znaną zależność, że
// bezpieczniki działają, i że model NIE wchodzi do gry, gdy nie ma przewagi
// nad wzorem — bo cicha regresja na garstce punktów jest gorsza niż jawny wzór.

function cechy(over: Partial<TimestepFeatures> = {}): TimestepFeatures {
  return { minCellDim: 0.1, domainVolume: 1000, totalCells: 1_000_000, meshCount: 8, hrrpua: 500, tEnd: 600, obstCount: 40, ...over };
}

describe("featureVector", () => {
  it("ma tyle pozycji, ile nazwanych członów", () => {
    expect(featureVector(cechy())).toHaveLength(TIMESTEP_TERMS.length);
  });

  it("zaczyna się od wyrazu wolnego", () => {
    expect(featureVector(cechy())[0]) .toBe(1);
  });

  it("nie wywraca się na zerach i brakach", () => {
    const v = featureVector({ minCellDim: null, domainVolume: null, totalCells: 0, meshCount: 0, hrrpua: null, tEnd: null, obstCount: null });
    expect(v.every(Number.isFinite)).toBe(true);
  });

  it("drobniejsza siatka obniża człon ln dx", () => {
    expect(featureVector(cechy({ minCellDim: 0.05 }))[1])
      .toBeLessThan(featureVector(cechy({ minCellDim: 0.2 }))[1]);
  });

  it("silniejszy pożar podnosi człon HRRPUA", () => {
    expect(featureVector(cechy({ hrrpua: 2000 }))[4])
      .toBeGreaterThan(featureVector(cechy({ hrrpua: 100 }))[4]);
  });
});

describe("cflTimestep — model zapasowy", () => {
  it("trzyma się granic kroku", () => {
    for (const dx of [0.001, 0.01, 0.1, 1, 10]) {
      const dt = cflTimestep(cechy({ minCellDim: dx }));
      expect(dt).toBeGreaterThanOrEqual(DT_MIN);
      expect(dt).toBeLessThanOrEqual(DT_MAX);
    }
  });

  it("drobniejsza siatka daje krótszy krok", () => {
    expect(cflTimestep(cechy({ minCellDim: 0.05 })))
      .toBeLessThan(cflTimestep(cechy({ minCellDim: 0.5 })));
  });

  it("NIE reaguje na pożar — to właśnie była jego wada", () => {
    // Zapisane wprost, żeby nikt nie uznał tego za przypadek: wzór CFL nie widzi
    // HRRPUA. Jeśli kiedyś zacznie, ten test upadnie i trzeba go świadomie zdjąć.
    expect(cflTimestep(cechy({ hrrpua: 50 }))).toBe(cflTimestep(cechy({ hrrpua: 5000 })));
  });
});

describe("effectiveVelocity", () => {
  it("ma dolna granice, ale sufit juz nie krepuje kalibracji", () => {
    expect(effectiveVelocity(1e-9)).toBeGreaterThanOrEqual(4);
    // Sufit 20 m/s byl glownym zrodlem niedoszacowania czasu: kalibracja
    // wyliczala z logow wyzsze V, a ta funkcja je przycinala. Test pilnuje,
    // zeby nikt go nie przywrocil "dla porzadku".
    expect(effectiveVelocity(1e6, 50)).toBeGreaterThan(20);
    expect(Number.isFinite(effectiveVelocity(1e15, 1e6))).toBe(true);
  });

  it("rośnie ze skalą domeny", () => {
    expect(effectiveVelocity(100_000)).toBeGreaterThan(effectiveVelocity(100));
  });
});

describe("typicalErrorFactor", () => {
  it("dla trafnych prognoz daje 1", () => {
    expect(typicalErrorFactor([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 9);
  });

  it("mierzy krotność, nie różnicę — pomyłka w dół i w górę waży tak samo", () => {
    expect(typicalErrorFactor([2], [1])).toBeCloseTo(2, 9);
    expect(typicalErrorFactor([1], [2])).toBeCloseTo(2, 9);
  });

  it("pomija pary z zerem zamiast zwracać NaN", () => {
    expect(Number.isFinite(typicalErrorFactor([0, 2], [1, 1]))).toBe(true);
  });
});

describe("fitTimestepModel", () => {
  /** Zbiór, w którym dt zależy od dx i od pożaru wg znanej reguły. */
  function zbior(n: number): TimestepSample[] {
    const out: TimestepSample[] = [];
    for (let i = 0; i < n; i++) {
      const dx = 0.05 + (i % 7) * 0.03;
      const hrrpua = 100 + (i % 5) * 700;
      const cells = 200_000 + (i % 11) * 150_000;
      const meshes = 4 + (i % 4) * 4;
      const volume = 300 + (i % 9) * 900;
      // Reguła generująca: krok maleje z dx i z intensywnością pożaru.
      const dt = (0.02 * dx) / Math.pow(1 + hrrpua, 0.25);
      out.push({ minCellDim: dx, domainVolume: volume, totalCells: cells, meshCount: meshes, hrrpua, tEnd: 300 + (i % 6) * 400, obstCount: 10 + (i % 13) * 20, dt });
    }
    return out;
  }

  it("przy zbyt małej liczbie biegów zostaje przy wzorze", () => {
    const m = fitTimestepModel(zbior(MIN_SAMPLES - 1));
    expect(m.kind).toBe("cfl");
    expect(m.samples).toBe(MIN_SAMPLES - 1);
  });

  it("na danych z wyraźną regułą uczy się i bije wzór CFL", () => {
    const m = fitTimestepModel(zbior(60));
    expect(m.kind).toBe("learned");
    expect(m.typicalFactor).toBeLessThan(m.cflFactor);
    expect(m.coef).toHaveLength(TIMESTEP_TERMS.length);
  });

  it("odtwarza kierunek zależności od pożaru", () => {
    const m = fitTimestepModel(zbior(60));
    // W danych silniejszy pożar skraca krok, więc współczynnik przy HRRPUA
    // musi być ujemny. To sprawdza, że regresja uczy się fizyki, a nie szumu.
    expect(m.coef[4]).toBeLessThan(0);
  });

  it("wyuczony model prognozuje dokładniej niż wzór", () => {
    const próbki = zbior(60);
    const m = fitTimestepModel(próbki);
    const real = próbki.map((s) => s.dt);
    const uczony = typicalErrorFactor(próbki.map((s) => predictTimestep(s, m)), real);
    const wzor = typicalErrorFactor(próbki.map((s) => cflTimestep(s)), real);
    expect(uczony).toBeLessThan(wzor);
  });

  it("gdy wzor CFL juz trafia, model NIE wypiera go regresja", () => {
    // Krok generowany dokladnie tym wzorem, ktory sluzy za model zapasowy.
    // Regresja nie ma tu czego poprawic, wiec ma zostawic wzor w spokoju —
    // to zabezpieczenie przed podmiana dzialajacej fizyki na dopasowanie.
    let seed = 11;
    const losowe = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const probki: TimestepSample[] = Array.from({ length: 45 }, () => {
      const f: TimestepFeatures = {
        minCellDim: 0.03 + losowe() * 0.3,
        domainVolume: 100 + losowe() * 5000,
        totalCells: 100_000 + Math.floor(losowe() * 2_000_000),
        meshCount: 1 + Math.floor(losowe() * 32),
        hrrpua: losowe() * 3000,
        tEnd: 200 + losowe() * 3000,
        obstCount: Math.floor(losowe() * 400),
      };
      return { ...f, dt: cflTimestep(f) };
    });
    expect(fitTimestepModel(probki).kind).toBe("cfl");
  });

  it("ocena jakosci pochodzi z danych odlozonych, nie uczacych", () => {
    // Model wyuczony musi miec uczciwa ocene: blad z walidacji krzyzowej jest
    // zwykle WYZSZY niz dopasowanie do wlasnych danych uczacych. Gdyby ktos
    // wrocil do liczenia bledu "od srodka", ta wartosc spadlaby nierealnie nisko.
    const m = fitTimestepModel(zbior(60));
    expect(m.kind).toBe("learned");
    expect(m.typicalFactor).toBeGreaterThan(1);
  });

  it("odrzuca biegi z niepoprawnym krokiem zamiast się wywracać", () => {
    const próbki = [...zbior(30), { ...zbior(1)[0], dt: 0 }, { ...zbior(1)[0], dt: NaN }];
    const m = fitTimestepModel(próbki);
    expect(m.samples).toBe(30);
    expect(Number.isFinite(m.cflFactor)).toBe(true);
  });

  it("pusty zbiór nie rzuca", () => {
    expect(() => fitTimestepModel([])).not.toThrow();
    expect(fitTimestepModel([]).kind).toBe("cfl");
  });
});

describe("predictTimestep — bariery przed rozjazdem", () => {
  /** Model uczony na biegach, ktore ZAWSZE maja przeszkody. */
  function modelZPrzeszkodami() {
    const out: TimestepSample[] = [];
    for (let i = 0; i < 60; i++) {
      const dx = 0.05 + (i % 7) * 0.03;
      const obst = 50 + (i % 9) * 30; // nigdy zera
      out.push({
        minCellDim: dx, domainVolume: 800 + (i % 5) * 600,
        totalCells: 300_000 + (i % 11) * 120_000, meshCount: 8 + (i % 3) * 4,
        hrrpua: null, tEnd: 600 + (i % 4) * 600, obstCount: obst,
        dt: (0.02 * dx) / Math.pow(1 + obst, 0.3),
      });
    }
    return fitTimestepModel(out);
  }

  it("model bez przeszkód nie rozsadza prognozy — wraca do wzoru", () => {
    // Dokladnie ten przypadek wysypal wycene: plik bez ani jednej przeszkody,
    // podczas gdy wszystkie biegi uczace je mialy. Czlon ln(1+przeszkod) znikal
    // i wypychal krok o dwa rzedy w gore — 54 h zamienialo sie w 31 minut.
    const m = modelZPrzeszkodami();
    expect(m.kind).toBe("learned");

    const bezPrzeszkod = cechy({ obstCount: 0, minCellDim: 0.1 });
    expect(predictTimestep(bezPrzeszkod, m)).toBe(cflTimestep(bezPrzeszkod));
  });

  it("prognoza nigdy nie odchodzi od warunku CFL bardziej niz 4x", () => {
    // CFL to twardy limit stabilnosci solvera, nie heurystyka. Regresja moze
    // uscislac wynik, ale nie ma prawa go zanegowac.
    const m = modelZPrzeszkodami();
    for (const dx of [0.02, 0.05, 0.1, 0.25, 0.5]) {
      for (const obst of [60, 120, 240]) {
        const f = cechy({ minCellDim: dx, obstCount: obst, domainVolume: 1200 });
        const dt = predictTimestep(f, m);
        const cfl = cflTimestep(f);
        expect(dt).toBeLessThanOrEqual(cfl * 4 + 1e-12);
        expect(dt).toBeGreaterThanOrEqual(cfl / 4 - 1e-12);
      }
    }
  });

  it("skrajne wspolczynniki nie przebijaja bariery CFL", () => {
    const dziki = {
      kind: "learned" as const, coef: [40, 0, 0, 0, 0, 0, 0],
      samples: 99, typicalFactor: 1, cflFactor: 2,
    };
    const f = cechy();
    expect(predictTimestep(f, dziki)).toBeLessThanOrEqual(cflTimestep(f) * 4 + 1e-12);
  });

  it("w zakresie uczenia model dalej dziala — bariera nie wylacza go calkiem", () => {
    const m = modelZPrzeszkodami();
    // hrrpua: null tak jak w zbiorze uczacym — inaczej cecha wypada poza zakres
    // i (poprawnie) uruchamia sie straznik ekstrapolacji.
    const f = cechy({ minCellDim: 0.08, obstCount: 110, domainVolume: 1400, totalCells: 500_000, meshCount: 8, hrrpua: null, tEnd: 900 });
    // Wewnatrz zakresu prognoza ma pochodzic z regresji, a nie ze wzoru.
    expect(predictTimestep(f, m)).not.toBe(cflTimestep(f));
  });
});

describe("predictTimestep", () => {
  it("bez modelu używa wzoru CFL", () => {
    expect(predictTimestep(cechy(), CFL_MODEL)).toBe(cflTimestep(cechy()));
  });

  it("prognoza wyuczona nigdy nie wychodzi poza granice kroku", () => {
    const dziwny = { kind: "learned" as const, coef: [50, 0, 0, 0, 0], samples: 99, typicalFactor: 1, cflFactor: 2 };
    expect(predictTimestep(cechy(), dziwny)).toBeLessThanOrEqual(DT_MAX);

    const dziwny2 = { ...dziwny, coef: [-50, 0, 0, 0, 0] };
    expect(predictTimestep(cechy(), dziwny2)).toBeGreaterThanOrEqual(DT_MIN);
  });

  it("uszkodzone współczynniki nie psują prognozy", () => {
    const zepsuty = { kind: "learned" as const, coef: [NaN, 0, 0, 0, 0], samples: 99, typicalFactor: 1, cflFactor: 2 };
    expect(Number.isFinite(predictTimestep(cechy(), zepsuty))).toBe(true);
  });
});
