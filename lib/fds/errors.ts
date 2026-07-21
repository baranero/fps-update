// Wyjaśnienia typowych błędów FDS — zamienia surowe linie z konsoli FDS
// na czytelny opis (co oznacza + jak naprawić), po polsku lub angielsku.
// Dla nierozpoznanych błędów zwraca opis generyczny z zachowanym kodem ERROR(NNN).

export type ErrLocale = "pl" | "en";

export interface FdsErrorInfo {
  code: string | null;   // np. "552"
  raw: string;           // oryginalna linia z logu
  title: string;         // krótki tytuł
  explanation: string;   // co oznacza
  hint: string;          // jak naprawić
}

interface Loc {
  title: string;
  explanation: string;
  hint: string;
}

interface Matcher {
  test: RegExp;
  code?: string;
  pl: Loc;
  en: Loc;
}

const MATCHERS: Matcher[] = [
  {
    test: /ductnode must lie|single pressure zone|ERROR\(552\)/i,
    code: "552",
    pl: {
      title: "Węzeł kanału HVAC w wielu strefach ciśnienia",
      explanation:
        "Węzeł systemu wentylacji (DUCTNODE / VENT powiązany z siecią HVAC) leży na granicy dwóch stref ciśnienia (PRESSURE_ZONE) albo poza otworem, do którego jest przypisany. FDS wymaga, aby każdy węzeł kanału mieścił się w całości w jednej strefie.",
      hint:
        "Sprawdź współrzędne wskazanego węzła/nawiewnika (np. Vent13) oraz granice stref &ZONE. Przesuń węzeł tak, by w całości leżał w jednej strefie, albo popraw definicję powiązanego &VENT (XB/XYZ).",
    },
    en: {
      title: "HVAC duct node spans multiple pressure zones",
      explanation:
        "A ventilation-system node (DUCTNODE / a VENT linked to the HVAC network) lies on the boundary of two pressure zones (PRESSURE_ZONE) or outside the opening it is assigned to. FDS requires each duct node to lie entirely within a single zone.",
      hint:
        "Check the coordinates of the indicated node/vent (e.g. Vent13) and the &ZONE boundaries. Move the node so it lies entirely in one zone, or fix the linked &VENT definition (XB/XYZ).",
    },
  },
  {
    test: /improperly set-?up/i,
    pl: {
      title: "Plik wejściowy zawiera błędy — FDS przerwał",
      explanation:
        "FDS zwalidował dane wejściowe, wykrył błędy konfiguracji i zatrzymał się przed rozpoczęciem obliczeń. Konkretne przyczyny to pozostałe linie ERROR(...) wypisane powyżej.",
      hint: "Popraw wskazane pozycje w pliku FDS (lub w modelu PyroSim) i wyślij plik ponownie.",
    },
    en: {
      title: "Input file contains errors — FDS aborted",
      explanation:
        "FDS validated the input, detected configuration errors and stopped before starting the computation. The specific causes are the remaining ERROR(...) lines printed above.",
      hint: "Fix the indicated items in the FDS file (or in the PyroSim model) and resubmit.",
    },
  },
  {
    test: /numerical instability|velocity error|CFL/i,
    pl: {
      title: "Niestabilność numeryczna",
      explanation:
        "Rozwiązanie się rozbiegło — pojawiły się niefizyczne prędkości/temperatury. Zwykle wynika ze zbyt grubej lub niespójnej siatki albo zbyt agresywnych warunków (np. bardzo duże HRRPUA na małej powierzchni).",
      hint:
        "Zagęść siatkę w rejonie źródła pożaru i przy otworach, sprawdź warunki brzegowe (&VENT, &SURF) i moc pożaru. FDS sam obniża krok czasowy, ale przy uporczywej niestabilności popraw geometrię/siatkę.",
    },
    en: {
      title: "Numerical instability",
      explanation:
        "The solution diverged — non-physical velocities/temperatures appeared. Usually caused by a too-coarse or inconsistent mesh, or overly aggressive conditions (e.g. very high HRRPUA over a small area).",
      hint:
        "Refine the mesh near the fire source and openings, check the boundary conditions (&VENT, &SURF) and the fire power. FDS lowers the time step itself, but for persistent instability fix the geometry/mesh.",
    },
  },
  {
    test: /not aligned|do(es)? not abut|cells do not|mesh.*align/i,
    pl: {
      title: "Siatki MESH nie są wyrównane",
      explanation:
        "Sąsiednie siatki (&MESH) nie mają pokrywających się krawędzi komórek na styku. FDS wymaga zgodności siatek — komórki na granicy muszą się nakładać.",
      hint:
        "Dopasuj wymiary i rozdzielczość sąsiednich siatek tak, by rozmiary komórek były zgodne (wielokrotności), a granice leżały na wspólnych płaszczyznach.",
    },
    en: {
      title: "MESH grids are not aligned",
      explanation:
        "Adjacent meshes (&MESH) do not have matching cell edges at their interface. FDS requires conforming meshes — cells at the boundary must line up.",
      hint:
        "Match the dimensions and resolution of adjacent meshes so cell sizes are compatible (multiples) and boundaries lie on common planes.",
    },
  },
  {
    test: /out of memory|cannot allocate|allocation.*fail|killed/i,
    pl: {
      title: "Zabrakło pamięci na serwerze",
      explanation:
        "Proces FDS przekroczył dostępną pamięć RAM maszyny. Zwykle oznacza to zbyt dużą liczbę komórek jak na dobrany serwer.",
      hint:
        "Zmniejsz liczbę komórek (grubsza siatka) lub podziel model na więcej siatek MPI. Skontaktuj się z nami — dobierzemy mocniejszą maszynę.",
    },
    en: {
      title: "Ran out of memory on the server",
      explanation:
        "The FDS process exceeded the machine's available RAM. This usually means too many cells for the selected server.",
      hint:
        "Reduce the cell count (coarser mesh) or split the model into more MPI meshes. Contact us — we will pick a more powerful machine.",
    },
  },
  {
    test: /forrtl: severe|segmentation fault|signal/i,
    pl: {
      title: "Awaria procesu obliczeniowego",
      explanation:
        "Solver FDS przerwał działanie na poziomie systemowym (błąd wykonania Fortran/MPI). Najczęściej skutek uszkodzonego pliku wejściowego lub niestabilności numerycznej.",
      hint: "Sprawdź poprawność pliku FDS. Jeśli plik liczył się wcześniej lokalnie, prześlij nam go — przeanalizujemy log.",
    },
    en: {
      title: "Compute process crash",
      explanation:
        "The FDS solver terminated at the system level (a Fortran/MPI runtime error). Most often the result of a corrupted input file or numerical instability.",
      hint: "Check the FDS file for correctness. If the file ran locally before, send it to us — we will analyze the log.",
    },
  },
];

function generic(code: string | null, locale: ErrLocale): Loc {
  if (locale === "en") {
    return {
      title: code ? `FDS error (code ${code})` : "FDS error",
      explanation: "FDS rejected the input at this location and aborted model setup.",
      hint: "Check the indicated item in the FDS file. Error codes are described in the FDS User Guide (appendix “Error Codes”). If unsure, send us the file.",
    };
  }
  return {
    title: code ? `Błąd FDS (kod ${code})` : "Błąd FDS",
    explanation: "FDS odrzucił dane wejściowe w tej pozycji i przerwał konfigurację modelu.",
    hint: "Sprawdź wskazany element w pliku FDS. Kody błędów opisuje FDS User Guide (dodatek „Error Codes”). W razie wątpliwości prześlij nam plik.",
  };
}

export function explainFdsErrors(log: string | null, locale: ErrLocale = "pl"): FdsErrorInfo[] {
  if (!log) return [];

  const seenMatchers = new Set<Matcher>();
  const seenLines = new Set<string>();
  const out: FdsErrorInfo[] = [];

  for (const raw of log.split("\n")) {
    const line = raw.trim();
    if (!line || !/\berror\b/i.test(line) || /warning/i.test(line)) continue;
    if (seenLines.has(line)) continue;
    seenLines.add(line);

    const codeM = line.match(/ERROR\((\d+)\)/i);
    const code = codeM ? codeM[1] : null;

    const m = MATCHERS.find((mm) => mm.test.test(line));
    if (m) {
      if (seenMatchers.has(m)) continue; // nie powtarzaj tego samego wyjaśnienia
      seenMatchers.add(m);
      const loc = m[locale];
      out.push({ code: code ?? m.code ?? null, raw: line, title: loc.title, explanation: loc.explanation, hint: loc.hint });
    } else {
      const loc = generic(code, locale);
      out.push({ code, raw: line, title: loc.title, explanation: loc.explanation, hint: loc.hint });
    }
    if (out.length >= 8) break;
  }

  return out;
}
