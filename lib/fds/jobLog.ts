// ─── Czytanie logu maszyny liczącej ──────────────────────────────────────────
//
// Wydzielone ze strony zlecenia (app/[locale]/symulacje/[caseId]/page.tsx),
// która urosła do ~1770 linii i trzymała te funkcje wymieszane z widokiem —
// nie dało się ich ani przetestować, ani użyć gdzie indziej. To jest czysta
// logika: string na wejściu, dane na wyjściu, zero React i zero DOM.
//
// Log ma dwie warstwy: postęp solvera FDS (kroki czasowe, nagłówek wersji)
// i telemetrię naszego runnera (instalacja, wysyłka plików). Pierwsza jest
// treścią dla klienta, druga — szumem.

/**
 * Czy log niesie błąd, po którym obliczenia na pewno nie ruszą dalej.
 *
 * Nie każde słowo „error" w logu FDS jest śmiertelne (bywają ostrzeżenia
 * o siatce), więc dopasowujemy WYŁĄCZNIE wzorce zatrzymujące solver.
 */
export function hasFatalFdsError(log: string | null): boolean {
  if (!log) return false;
  return /improperly set-?up|forrtl:\s*severe|\bFatal error\b/i.test(log);
}

/** Ostatnie kilkanaście UNIKALNYCH linii wyglądających na błąd — do diagnozy. */
export function extractErrorLines(log: string | null): string[] {
  if (!log) return [];
  const rx = /\b(error|fatal|forrtl|severe|abort|cannot|not found|failed|denied|no such)\b/i;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of log.split("\n")) {
    const l = raw.trim();
    if (!l || !rx.test(l) || seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out.slice(-12);
}

// Telemetria runnera: rozmiary wysyłanych plików, instalacja pakietów,
// pobieranie instalatora. Nic z tego nie mówi klientowi o jego modelu,
// a potrafiło zająć cały panel konsoli.
const LOG_NOISE =
  /^(podglad|podglad-diag|migawka wynikow|Downloading|Instaluj|Running FDS installer|FDS extracted|FDS installed|FDS ready|Input ready|Uploading results|→)/i;

export type ConsoleEntry = { time: string; msg: string; tone: "ink" | "signal" | "muted" };

/**
 * Kilka ostatnich wpisów do panelu konsoli.
 *
 * Postęp solvera powtarza się setki razy, więc zostaje z niego wyłącznie
 * NAJNOWSZY krok — reszta miejsca należy do kamieni milowych.
 */
export function consoleLogEntries(log: string | null, max = 4): ConsoleEntry[] {
  if (!log) return [];

  const milestones: ConsoleEntry[] = [];
  let latestStep: ConsoleEntry | null = null;

  for (const raw of log.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const time = (line.match(/\d{2}:\d{2}:\d{2}/) ?? ["—"])[0];
    const body = line.replace(/^\[?\d{2}:\d{2}:\d{2}(?:\.\d+)?\]?\s*/, "").trim();
    if (!body || LOG_NOISE.test(body)) continue;

    const step = body.match(/Time Step:\s*(\d+).*?Simulation Time:\s*([\d.]+)/i);
    if (step) {
      latestStep = {
        time,
        msg: `KROK ${step[1]} // T = ${parseFloat(step[2]).toFixed(2)} s`,
        tone: "signal",
      };
      continue;
    }

    const isError = /^(ERROR|FDS exit 0, ale)/i.test(body);
    milestones.push({
      time,
      msg: body.replace(/^===\s*/, "").replace(/\s*===$/, "").slice(0, 64),
      tone: isError ? "ink" : "muted",
    });
  }

  // Najnowszy krok solvera na górze, pod nim ostatnie kamienie milowe.
  const tail = milestones.slice(-(max - (latestStep ? 1 : 0))).reverse();
  return latestStep ? [latestStep, ...tail] : tail;
}

/**
 * Postęp z ODCZYTU SOLVERA: ile sekund symulacji policzono względem czasu
 * końcowego z pliku. Jedyna wiarygodna miara — prognoza czasu potrafi się
 * mylić kilkukrotnie.
 */
export function parseFdsProgress(log: string, tEnd: number): { pct: number; currentTime: number } | null {
  const matches = Array.from(log.matchAll(/Simulation Time:\s*([\d.E+\-]+)\s*s/g));
  if (!matches.length || !tEnd) return null;
  const currentTime = parseFloat(matches[matches.length - 1][1]);
  if (isNaN(currentTime)) return null;
  return { pct: Math.min(100, (currentTime / tEnd) * 100), currentTime };
}

export interface FdsStats {
  version: string | null;
  chid: string | null;
  currentStep: number | null;
  currentTime: number | null;
  stepSize: number | null;
  iteRate: string | null;
  meshCount: number | null;
  totalCells: number | null;
  startTime: string | null;
}

/** Nagłówek i bieżący stan solvera — liczby pokazywane w szynie konsoli. */
export function parseFdsStats(log: string): FdsStats {
  const version   = log.match(/Revision\s*:\s*(\S+)/)?.[1] ?? null;
  const chid      = log.match(/Job ID string\s*:\s*(.+)/)?.[1]?.trim() ?? null;
  const startTime = log.match(/Current Date\s*:\s*(.+)/)?.[1]?.trim() ?? null;

  const tsMatches = Array.from(
    log.matchAll(/Time Step:\s*(\d+),\s*Simulation Time:\s*([\d.E+\-]+)\s*s/g)
  );
  const lastTs      = tsMatches[tsMatches.length - 1];
  const currentStep = lastTs ? parseInt(lastTs[1]) : null;
  const currentTime = lastTs ? parseFloat(lastTs[2]) : null;

  // Krok czasowy liczymy z DWÓCH ostatnich próbek; gdy log podaje go wprost
  // („Step Size"), ta wartość wygrywa jako dokładniejsza.
  let stepSize: number | null = null;
  if (tsMatches.length >= 2) {
    const prev = tsMatches[tsMatches.length - 2];
    const last = tsMatches[tsMatches.length - 1];
    const dTime  = parseFloat(last[2]) - parseFloat(prev[2]);
    const dSteps = parseInt(last[1]) - parseInt(prev[1]);
    if (dSteps > 0 && dTime > 0) stepSize = dTime / dSteps;
  }

  const detailMatch = log.match(/Step Size:\s*([\d.E+\-]+)\s*s/);
  if (detailMatch) stepSize = parseFloat(detailMatch[1]);

  const iteRateMatch = log.match(/Ite Rate\/Proc:\s*([\d.E+\-nan]+)/);
  const iteRate = iteRateMatch?.[1] ?? null;

  const meshLines = Array.from(log.matchAll(/Number of Grid Cells\s+([\d,\s]+)/g));
  const totalCells = meshLines.length
    ? meshLines.reduce((s, m) => s + parseInt(m[1].replace(/[\s,]/g, "")), 0)
    : null;
  const meshCount = meshLines.length || null;

  return { version, chid, currentStep, currentTime, stepSize, iteRate, meshCount, totalCells, startTime };
}
