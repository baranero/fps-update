// Wyjaśnienia typowych błędów FDS — zamienia surowe linie z konsoli FDS
// na czytelny opis po polsku (co oznacza + jak naprawić). Dla nierozpoznanych
// błędów zwraca opis generyczny z zachowanym kodem ERROR(NNN).

export interface FdsErrorInfo {
  code: string | null;   // np. "552"
  raw: string;           // oryginalna linia z logu
  title: string;         // krótki tytuł PL
  explanation: string;   // co oznacza
  hint: string;          // jak naprawić
}

interface Matcher {
  test: RegExp;
  code?: string;
  title: string;
  explanation: string;
  hint: string;
}

const MATCHERS: Matcher[] = [
  {
    test: /ductnode must lie|single pressure zone|ERROR\(552\)/i,
    code: "552",
    title: "Węzeł kanału HVAC w wielu strefach ciśnienia",
    explanation:
      "Węzeł systemu wentylacji (DUCTNODE / VENT powiązany z siecią HVAC) leży na granicy dwóch stref ciśnienia (PRESSURE_ZONE) albo poza otworem, do którego jest przypisany. FDS wymaga, aby każdy węzeł kanału mieścił się w całości w jednej strefie.",
    hint:
      "Sprawdź współrzędne wskazanego węzła/nawiewnika (np. Vent13) oraz granice stref &ZONE. Przesuń węzeł tak, by w całości leżał w jednej strefie, albo popraw definicję powiązanego &VENT (XB/XYZ).",
  },
  {
    test: /improperly set-?up/i,
    title: "Plik wejściowy zawiera błędy — FDS przerwał",
    explanation:
      "FDS zwalidował dane wejściowe, wykrył błędy konfiguracji i zatrzymał się przed rozpoczęciem obliczeń. Konkretne przyczyny to pozostałe linie ERROR(...) wypisane powyżej.",
    hint: "Popraw wskazane pozycje w pliku FDS (lub w modelu PyroSim) i wyślij plik ponownie.",
  },
  {
    test: /numerical instability|velocity error|CFL/i,
    title: "Niestabilność numeryczna",
    explanation:
      "Rozwiązanie się rozbiegło — pojawiły się niefizyczne prędkości/temperatury. Zwykle wynika ze zbyt grubej lub niespójnej siatki albo zbyt agresywnych warunków (np. bardzo duże HRRPUA na małej powierzchni).",
    hint:
      "Zagęść siatkę w rejonie źródła pożaru i przy otworach, sprawdź warunki brzegowe (&VENT, &SURF) i moc pożaru. FDS sam obniża krok czasowy, ale przy uporczywej niestabilności popraw geometrię/siatkę.",
  },
  {
    test: /not aligned|do(es)? not abut|cells do not|mesh.*align/i,
    title: "Siatki MESH nie są wyrównane",
    explanation:
      "Sąsiednie siatki (&MESH) nie mają pokrywających się krawędzi komórek na styku. FDS wymaga zgodności siatek — komórki na granicy muszą się nakładać.",
    hint:
      "Dopasuj wymiary i rozdzielczość sąsiednich siatek tak, by rozmiary komórek były zgodne (wielokrotności), a granice leżały na wspólnych płaszczyznach.",
  },
  {
    test: /out of memory|cannot allocate|allocation.*fail|killed/i,
    title: "Zabrakło pamięci na serwerze",
    explanation:
      "Proces FDS przekroczył dostępną pamięć RAM maszyny. Zwykle oznacza to zbyt dużą liczbę komórek jak na dobrany serwer.",
    hint:
      "Zmniejsz liczbę komórek (grubsza siatka) lub podziel model na więcej siatek MPI. Skontaktuj się z nami — dobierzemy mocniejszą maszynę.",
  },
  {
    test: /forrtl: severe|segmentation fault|signal/i,
    title: "Awaria procesu obliczeniowego",
    explanation:
      "Solver FDS przerwał działanie na poziomie systemowym (błąd wykonania Fortran/MPI). Najczęściej skutek uszkodzonego pliku wejściowego lub niestabilności numerycznej.",
    hint: "Sprawdź poprawność pliku FDS. Jeśli plik liczył się wcześniej lokalnie, prześlij nam go — przeanalizujemy log.",
  },
];

export function explainFdsErrors(log: string | null): FdsErrorInfo[] {
  if (!log) return [];

  const seenTitles = new Set<string>();
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
      if (seenTitles.has(m.title)) continue; // nie powtarzaj tego samego wyjaśnienia
      seenTitles.add(m.title);
      out.push({ code: code ?? m.code ?? null, raw: line, title: m.title, explanation: m.explanation, hint: m.hint });
    } else {
      out.push({
        code,
        raw: line,
        title: code ? `Błąd FDS (kod ${code})` : "Błąd FDS",
        explanation: "FDS odrzucił dane wejściowe w tej pozycji i przerwał konfigurację modelu.",
        hint: "Sprawdź wskazany element w pliku FDS. Kody błędów opisuje FDS User Guide (dodatek „Error Codes”). W razie wątpliwości prześlij nam plik.",
      });
    }
    if (out.length >= 8) break;
  }

  return out;
}
