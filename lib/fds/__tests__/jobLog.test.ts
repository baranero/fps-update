import { describe, expect, it } from "vitest";
import {
  consoleLogEntries, extractErrorLines, hasFatalFdsError, parseFdsProgress, parseFdsStats,
} from "@/lib/fds/jobLog";

// Fragment logu w kształcie, w jakim przychodzi z maszyny liczącej: nagłówek
// FDS, telemetria naszego runnera i powtarzające się kroki solvera.
const LOG = [
  "[10:00:01] Downloading FDS installer",
  "[10:00:30] Running FDS installer",
  "[10:01:00] FDS ready",
  "[10:01:02] === START OBLICZEN ===",
  " Revision         : FDS6.9.1-0-g889da6a",
  " Job ID string    : garaz_poziom_-1",
  " Current Date     : September 22, 2026  10:01:02",
  " Number of Grid Cells            1 200 000",
  " Number of Grid Cells              900,000",
  "[10:02:00] Time Step:     100, Simulation Time:      12.50 s",
  "[10:03:00] Time Step:     200, Simulation Time:      25.00 s",
  " Ite Rate/Proc: 3.21",
  "[10:04:00] Uploading results 120 MB",
  "[10:04:10] === KONIEC ===",
].join("\n");

describe("rozpoznawanie błędu śmiertelnego", () => {
  it("łapie wzorce zatrzymujące solver", () => {
    expect(hasFatalFdsError("ERROR: Mesh is improperly set-up")).toBe(true);
    expect(hasFatalFdsError("forrtl: severe (174): SIGSEGV")).toBe(true);
    expect(hasFatalFdsError("Fatal error in MPI_Init")).toBe(true);
  });

  it("NIE uznaje zwykłego ostrzeżenia za błąd śmiertelny", () => {
    // W logu FDS „error" bywa w ostrzeżeniach o siatce — bieg trwa dalej.
    expect(hasFatalFdsError("WARNING: Mesh cell size error estimate 0.3")).toBe(false);
    expect(hasFatalFdsError(LOG)).toBe(false);
  });

  it("pusty log to brak błędu, nie błąd", () => {
    expect(hasFatalFdsError(null)).toBe(false);
    expect(hasFatalFdsError("")).toBe(false);
  });
});

describe("linie błędów do diagnozy", () => {
  it("zbiera linie wyglądające na błąd bez powtórzeń", () => {
    const log = ["ERROR: brak pliku", "ERROR: brak pliku", "wszystko ok", "cannot open mesh"].join("\n");
    expect(extractErrorLines(log)).toEqual(["ERROR: brak pliku", "cannot open mesh"]);
  });

  it("oddaje co najwyżej kilkanaście ostatnich", () => {
    const log = Array.from({ length: 50 }, (_, i) => `ERROR ${i}`).join("\n");
    const out = extractErrorLines(log);
    expect(out).toHaveLength(12);
    expect(out[out.length - 1]).toBe("ERROR 49");
  });
});

describe("panel konsoli", () => {
  it("wycina telemetrię runnera — klient jej nie czyta", () => {
    const joined = consoleLogEntries(LOG, 8).map((e) => e.msg).join(" | ");
    expect(joined).not.toMatch(/Downloading|Uploading results|FDS ready|installer/i);
  });

  it("z setek kroków solvera zostawia tylko najnowszy, na górze", () => {
    const entries = consoleLogEntries(LOG, 4);
    const steps = entries.filter((e) => e.msg.startsWith("KROK"));
    expect(steps).toHaveLength(1);
    expect(entries[0].msg).toBe("KROK 200 // T = 25.00 s");
    expect(entries[0].tone).toBe("signal");
  });

  it("nie przekracza zadanej liczby wpisów", () => {
    expect(consoleLogEntries(LOG, 3).length).toBeLessThanOrEqual(3);
  });

  it("pusty log to pusta lista", () => {
    expect(consoleLogEntries(null)).toEqual([]);
    expect(consoleLogEntries("")).toEqual([]);
  });
});

describe("postęp z odczytu solvera", () => {
  it("liczy procent z ostatniego czasu symulacji", () => {
    const p = parseFdsProgress(LOG, 50);
    expect(p?.currentTime).toBe(25);
    expect(p?.pct).toBe(50);
  });

  it("nie przekracza 100%, gdy solver przeskoczy czas końcowy", () => {
    expect(parseFdsProgress(LOG, 10)?.pct).toBe(100);
  });

  it("bez czasu końcowego albo bez odczytu oddaje null", () => {
    expect(parseFdsProgress(LOG, 0)).toBe(null);
    expect(parseFdsProgress("brak kroków", 50)).toBe(null);
  });
});

describe("nagłówek i stan solvera", () => {
  const s = parseFdsStats(LOG);

  it("czyta wersję, nazwę zadania i datę startu", () => {
    expect(s.version).toBe("FDS6.9.1-0-g889da6a");
    expect(s.chid).toBe("garaz_poziom_-1");
    expect(s.startTime).toBe("September 22, 2026  10:01:02");
  });

  it("bierze OSTATNI krok czasowy", () => {
    expect(s.currentStep).toBe(200);
    expect(s.currentTime).toBe(25);
  });

  it("liczy krok czasowy z dwóch ostatnich próbek", () => {
    // (25,00 − 12,50) s / (200 − 100) kroków = 0,125 s
    expect(s.stepSize).toBeCloseTo(0.125, 6);
  });

  it("sumuje komórki ze wszystkich siatek, także ze spacjami i przecinkami", () => {
    expect(s.totalCells).toBe(2_100_000);
    expect(s.meshCount).toBe(2);
  });

  it("pusty log nie wywraca odczytu — same nulle", () => {
    const empty = parseFdsStats("");
    expect(empty.version).toBe(null);
    expect(empty.currentStep).toBe(null);
    expect(empty.meshCount).toBe(null);
  });
});
