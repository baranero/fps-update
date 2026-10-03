// ─── Model kroku czasowego ───────────────────────────────────────────────────
//
// Krok czasowy decyduje o wszystkim: liczba kroków to czas liczenia, a czas
// liczenia to cena. Pomyłka o 7× na kroku to pomyłka o 7× na rachunku i na
// prognozie, którą widzi klient.
//
// ── Dlaczego poprzedni model zawodził ────────────────────────────────────────
//
// Liczył krok z warunku CFL: dt = 0,8 · dx / V, przyjmując prędkość
// charakterystyczną V = 4,3 · L^(1/3), gdzie L to pierwiastek sześcienny
// z objętości domeny. Model miał dwie wady nie do naprawienia strojeniem:
//
//   1. V zależało WYŁĄCZNIE od rozmiaru domeny. Pożar nie wchodził do rachunku
//      w ogóle — ten sam wzór dawał tę samą prędkość dla pustego korytarza
//      i dla palących się kabli w tej samej kubaturze. A to pożar rozpędza gaz
//      i to on wymusza drobny krok.
//   2. V było przycięte do 20 m/s. Gdy realny przepływ wymagał więcej, ŻADEN
//      współczynnik nie mógł tego nadrobić — kalibracja strojąca sam mnożnik
//      uderzała w sufit i cicho się poddawała.
//
// ── Co robi ten moduł ────────────────────────────────────────────────────────
//
// Zamiast wyprowadzać krok z fizyki przez pośrednika (prędkość), uczy się go
// wprost z zakończonych biegów. Dla każdego mamy zmierzony z logu FDS krok
// czasowy oraz cechy odczytane z pliku wsadowego. Regresja w przestrzeni
// logarytmów szuka zależności:
//
//   ln dt = b0 + b1·ln dx + b2·ln L + b3·ln(komórki/siatkę) + b4·ln(1 + HRRPUA)
//
// Przestrzeń logarytmiczna, bo wszystkie te wielkości działają MNOŻNIKOWO —
// dwa razy drobniejsza siatka to dwa razy mniejszy krok, nie „o tyle a tyle
// mniejszy". Błąd też mierzymy jako krotność, nie jako różnicę.
//
// Fizyka nie znika: warunek CFL mówi, że dt ∝ dx, więc b1 powinno wyjść blisko
// 1. Jeśli wyjdzie zupełnie inaczej, to sygnał, że dane są zepsute — i po to
// jest raport jakości dopasowania, a nie ślepe zaufanie do regresji.
//
// ── Bezpieczniki ─────────────────────────────────────────────────────────────
//
// Model wyuczony wchodzi do gry dopiero, gdy ma dość próbek I bije wzór CFL na
// tych samych danych. Inaczej zostaje stary wzór. Prognoza jest zawsze przycięta
// do fizycznie sensownego zakresu, żeby pojedynczy dziwny bieg nie wyprowadził
// regresji w kosmos.

// ─── Stałe modelu CFL (zapasowego) ───────────────────────────────────────────

/** Współczynnik CFL — wartość domyślna FDS. */
export const CFL_FACTOR = 0.8;
/** Zakładany rozmiar komórki [m], gdy plik nie podaje XB. */
export const DEFAULT_DX = 0.1;
/** Górne ograniczenie kroku [s]. */
export const DT_MAX = 0.5;
/** Dolne ograniczenie kroku [s]. */
export const DT_MIN = 0.001;

/** Prędkość charakterystyczna: V = coeff · L^(1/3), L = ∛objętość. */
export const V_COEFF = 4.3;
const V_EFF_MIN = 4;

// Sufit predkosci. UWAGA na interpretacje: V nie jest predkoscia gazu, tylko
// wielkoscia zastepcza zdefiniowana jako CFL*dx/dt. Absorbuje WSZYSTKO, czym
// FDS ogranicza krok — warunek CFL, ograniczenie dywergencji, chemie — wiec
// moze byc wielokrotnie wyzsza od jakiejkolwiek predkosci fizycznej.
//
// Poprzedni sufit 20 m/s ustawiono "na oko" z 11 biegow o predkosci 5,6-13,3 m/s
// i to on byl glownym zrodlem niedoszacowania czasu. Kalibracja poprawnie
// wyliczala z logow wysokie V, po czym `effectiveVelocity` przycinalo je do 20
// i wynik nauki szedl do kosza. Przy dx = 0,1 m dawalo to twarda podloge kroku
// 0,004 s — model nie potrafil przewidziec zadnego biegu szybszego niz to,
// niezaleznie od danych.
//
// Sufit zostaje wylacznie jako zabezpieczenie przed dzieleniem przez zero
// i absurdem; nie ma juz pelnic roli "zakresu fizycznego".
const V_EFF_MAX = 2000;

/** Prędkość charakterystyczna [m/s] z objętości domeny [m³] — model zapasowy. */
export function effectiveVelocity(domainVolumeM3: number, coeff = V_COEFF): number {
  const L = Math.cbrt(Math.max(1e-6, domainVolumeM3));
  return Math.min(V_EFF_MAX, Math.max(V_EFF_MIN, coeff * Math.cbrt(L)));
}

// ─── Cechy z pliku wsadowego ─────────────────────────────────────────────────

export interface TimestepFeatures {
  /** Najmniejszy wymiar komórki [m]; null = brak XB w pliku. */
  minCellDim: number | null;
  /** Suma objętości siatek [m³]; null = nie da się policzyć. */
  domainVolume: number | null;
  totalCells: number;
  meshCount: number;
  /**
   * Największe HRRPUA w pliku [kW/m²] — miara intensywności pożaru. To ona
   * rozpędza gaz i wymusza drobny krok, a poprzedni model jej nie widział.
   * null = plik nie deklaruje żadnego palącego się SURF.
   */
  hrrpua: number | null;
  /**
   * Czas symulacji z pliku [s]. Im dluzej trwa pozar, tym bardziej rozwiniety
   * przeplyw i tym krotszy SREDNI krok na calym biegu — a to srednia decyduje
   * o liczbie krokow. Zaleznosci tej nie widac w samej geometrii.
   */
  tEnd: number | null;
  /** Liczba przeszkod — zageszczenie geometrii komplikuje przeplyw. */
  obstCount: number | null;
}

/** Cechy plus zmierzony krok — pojedynczy wiersz do nauki. */
export interface TimestepSample extends TimestepFeatures {
  /** Średni krok czasowy odczytany z logu FDS [s]. */
  dt: number;
}

// ─── Wektor cech ─────────────────────────────────────────────────────────────
//
// Kolejność jest częścią kontraktu: współczynniki zapisane w kalibracji
// odnoszą się do tych pozycji. Dopisanie cechy unieważnia stare współczynniki,
// dlatego model niesie ze sobą listę nazw i liczbę próbek.

export const TIMESTEP_TERMS = ["1", "ln dx", "ln L", "ln komórek/siatkę", "ln(1+HRRPUA)", "ln tEnd", "ln(1+przeszkód)"] as const;

/** Bezpieczny logarytm — zero i wartości ujemne nie mogą wywrócić rachunku. */
const ln = (x: number, min = 1e-9): number => Math.log(Math.max(min, x));

export function featureVector(f: TimestepFeatures): number[] {
  const cells = Math.max(1, f.totalCells);
  const meshes = Math.max(1, f.meshCount);
  const dx = f.minCellDim && f.minCellDim > 0 ? f.minCellDim : DEFAULT_DX;
  const volume = f.domainVolume && f.domainVolume > 0 ? f.domainVolume : cells * dx ** 3;
  const L = Math.cbrt(volume);
  return [
    1,
    ln(dx),
    ln(L),
    ln(cells / meshes),
    ln(1 + Math.max(0, f.hrrpua ?? 0)),
    ln(f.tEnd && f.tEnd > 0 ? f.tEnd : 300),
    ln(1 + Math.max(0, f.obstCount ?? 0)),
  ];
}

// ─── Model ───────────────────────────────────────────────────────────────────

export interface TimestepModel {
  /** "learned" = regresja z historii, "cfl" = wzór zapasowy. */
  kind: "learned" | "cfl";
  /** Współczynniki regresji w kolejności TIMESTEP_TERMS. */
  coef: number[];
  /** Ile biegów posłużyło do nauki. */
  samples: number;
  /**
   * Typowa krotność pomyłki, np. 1,18 = model myli się zwykle o 18% w którąś
   * stronę. Liczona jako exp(mediana |ln(prognoza/rzeczywistość)|).
   */
  typicalFactor: number;
  /** To samo dla wzoru CFL na tych samych danych — do porównania. */
  cflFactor: number;
  /**
   * Zakres kazdej cechy w danych uczacych [min, max]. Poza nim regresja
   * log-liniowa ekstrapoluje wykladniczo i potrafi sie rozjechac o rzedy
   * wielkosci — wtedy oddajemy prognoze wzorowi.
   */
  range?: Array<[number, number]>;
}

export const CFL_MODEL: TimestepModel = {
  kind: "cfl", coef: [], samples: 0, typicalFactor: 0, cflFactor: 0,
};

/** Minimalna liczba biegów, by w ogóle ufać regresji. */
export const MIN_SAMPLES = 12;

/** Siła regularyzacji — trzyma współczynniki przy zerze, gdy cecha nic nie wnosi. */
const RIDGE = 1e-3;

// ─── Dopasowanie ─────────────────────────────────────────────────────────────

/** Rozwiązanie układu (XᵀX + λI)b = Xᵀy metodą eliminacji Gaussa z wyborem elementu głównego. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null; // układ osobliwy
    [M[col], M[piv]] = [M[piv], M[col]];

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const k = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= k * M[col][c];
    }
  }

  // Po pelnej eliminacji macierz jest diagonalna: rozwiazanie to RHS / przekatna.
  return M.map((row, i) => row[n] / row[i]);
}

const mediana = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

/** Typowa krotność pomyłki zestawu prognoz wobec wartości zmierzonych. */
export function typicalErrorFactor(pred: number[], real: number[]): number {
  const bledy = pred
    .map((p, i) => (p > 0 && real[i] > 0 ? Math.abs(Math.log(p / real[i])) : null))
    .filter((x): x is number => x !== null);
  return bledy.length ? Math.exp(mediana(bledy)) : 0;
}

/** Krok czasowy wg wzoru CFL — model zapasowy i punkt odniesienia. */
export function cflTimestep(f: TimestepFeatures, vCoeff = V_COEFF): number {
  const cells = Math.max(1, f.totalCells);
  const dx = f.minCellDim && f.minCellDim > 0 ? f.minCellDim : DEFAULT_DX;
  const volume = f.domainVolume && f.domainVolume > 0 ? f.domainVolume : cells * dx ** 3;
  const v = effectiveVelocity(volume, vCoeff);
  return Math.max(DT_MIN, Math.min((CFL_FACTOR * dx) / v, DT_MAX));
}

/**
 * Uczy model kroku czasowego na zakończonych biegach.
 *
 * Zwraca model wyuczony TYLKO wtedy, gdy ma dość próbek i wypada lepiej od
 * wzoru CFL na tych samych danych. W przeciwnym razie oddaje model zapasowy —
 * lepiej znany, przewidywalny błąd niż regresja na czterech punktach.
 */
/** Dopasowanie wspolczynnikow na podanym podzbiorze (bez oceny jakosci). */
function fitCoef(probki: TimestepSample[]): number[] | null {
  if (!probki.length) return null;
  const X = probki.map(featureVector);
  const y = probki.map((s) => Math.log(s.dt));
  const n = X[0].length;

  const XtX: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const Xty: number[] = new Array(n).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < n; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < n; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  // Wyrazu wolnego nie karzemy — przesuwa poziom, nie nadaje ksztaltu.
  for (let a = 1; a < n; a++) XtX[a][a] += RIDGE * X.length;

  const coef = solve(XtX, Xty);
  if (!coef || coef.some((c) => !Number.isFinite(c))) return null;
  return coef;
}

/**
 * Uczy model kroku czasowego na zakonczonych biegach.
 *
 * O tym, czy model wyuczony wchodzi do gry, decyduje blad na danych, KTORYCH
 * NIE WIDZIAL przy uczeniu (walidacja krzyzowa, 5 czesci). Porownywanie
 * dopasowania modelu z piecioma parametrami do bezparametrowego wzoru na tych
 * samych danych bylo nieuczciwe: regresja wygrywalaby zawsze, takze ucząc sie
 * czystego szumu. Wspolczynniki koncowe wyliczamy juz na calosci.
 *
 * Gdy walidacja nie pokaze realnej przewagi — zostaje wzor CFL. Lepszy znany
 * blad niz regresja udajaca wiedze.
 */
export function fitTimestepModel(samples: TimestepSample[]): TimestepModel {
  const dobre = samples.filter((s) => s.dt > 0 && Number.isFinite(s.dt) && s.totalCells > 0);

  const real = dobre.map((s) => s.dt);
  const cflFactor = typicalErrorFactor(dobre.map((s) => cflTimestep(s)), real);

  if (dobre.length < MIN_SAMPLES) {
    return { ...CFL_MODEL, samples: dobre.length, cflFactor };
  }

  // ── Walidacja krzyzowa: podzial deterministyczny (co k-ty), wiec wynik nie
  //    zalezy od losowania i ten sam zbior zawsze daje te sama ocene.
  const K = 5;
  const predCv: number[] = new Array(dobre.length).fill(0);
  for (let k = 0; k < K; k++) {
    const ucz = dobre.filter((_, i) => i % K !== k);
    const coefK = fitCoef(ucz);
    if (!coefK) return { ...CFL_MODEL, samples: dobre.length, cflFactor };
    dobre.forEach((s, i) => {
      if (i % K === k) predCv[i] = predictWithCoef(s, coefK);
    });
  }

  const typicalFactor = typicalErrorFactor(predCv, real);

  // Przewaga musi byc realna, nie remisowa.
  if (!(typicalFactor > 0) || typicalFactor >= cflFactor * 0.95) {
    return { ...CFL_MODEL, samples: dobre.length, cflFactor };
  }

  const coef = fitCoef(dobre);
  if (!coef) return { ...CFL_MODEL, samples: dobre.length, cflFactor };

  // Zakres cech w danych uczacych — poza nim prognoza wraca do wzoru.
  const X = dobre.map(featureVector);
  const range: Array<[number, number]> = X[0].map((_, i) => {
    const kol = X.map((w) => w[i]);
    return [Math.min(...kol), Math.max(...kol)] as [number, number];
  });

  return { kind: "learned", coef, samples: dobre.length, typicalFactor, cflFactor, range };
}

/**
 * Ile razy prognoza wyuczona moze odbiegac od wzoru CFL.
 *
 * Warunek CFL to TWARDY limit stabilnosci solvera, nie heurystyka — FDS nie
 * utrzyma kroku istotnie dluzszego, bo obliczenia by sie rozjechaly. Regresja
 * moze wiec uscislac wynik w obie strony, ale nie ma prawa go zanegowac.
 *
 * Bez tej bariery pojedyncza cecha poza zakresem uczenia (np. model bez zadnej
 * przeszkody, gdy wszystkie biegi uczace je mialy) wypychala krok o dwa rzedy
 * w gore i wycena spadala z godzin do minut.
 */
const MAX_ODCHYLENIE_OD_CFL = 4;

/** Czy cechy modelu mieszcza sie w zakresie, na ktorym model sie uczyl. */
function wZakresie(f: TimestepFeatures, range: Array<[number, number]> | undefined): boolean {
  if (!range) return true;
  const x = featureVector(f);
  for (let i = 1; i < x.length && i < range.length; i++) {
    const [lo, hi] = range[i];
    // Waski margines: dane rzadko pokrywaja zakres gesto, wiec drobne wyjscie
    // poza brzeg jeszcze nie jest ekstrapolacja.
    const margines = 0.1 * Math.max(1e-9, hi - lo);
    if (x[i] < lo - margines || x[i] > hi + margines) return false;
  }
  return true;
}

function predictWithCoef(f: TimestepFeatures, coef: number[]): number {
  const x = featureVector(f);
  let s = 0;
  for (let i = 0; i < coef.length && i < x.length; i++) s += coef[i] * x[i];
  if (!Number.isFinite(s)) return cflTimestep(f);

  // Fizyka ma ostatnie slowo: prognoza nie moze oddalic sie od warunku CFL
  // bardziej niz o ustalona krotnosc.
  const cfl = cflTimestep(f);
  const dolna = cfl / MAX_ODCHYLENIE_OD_CFL;
  const gorna = cfl * MAX_ODCHYLENIE_OD_CFL;
  const surowa = Math.exp(s);

  return Math.max(DT_MIN, Math.min(DT_MAX, Math.min(gorna, Math.max(dolna, surowa))));
}

/** Krok czasowy dla modelu wejściowego — wyuczony, gdy dostępny; inaczej CFL. */
export function predictTimestep(f: TimestepFeatures, model: TimestepModel = CFL_MODEL): number {
  if (model.kind === "learned" && model.coef.length && wZakresie(f, model.range)) {
    return predictWithCoef(f, model.coef);
  }
  return cflTimestep(f);
}
