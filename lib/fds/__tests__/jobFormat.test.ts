import { describe, expect, it } from "vitest";
import {
  elapsed, fileTypeKey, formatCells, formatDt, formatDuration, formatSize,
  packageLabel, remainingSec, splitDuration, totalSize,
} from "@/lib/fds/jobFormat";

describe("formatCells", () => {
  it("skraca miliony do dwóch miejsc", () => {
    expect(formatCells(2_100_000, "tys.")).toBe("2.10 M");
  });
  it("skraca tysiące podanym skrótem języka", () => {
    expect(formatCells(840_000, "tys.")).toBe("840 tys.");
    expect(formatCells(840_000, "k")).toBe("840 k");
  });
  it("małe liczby zostawia bez zmian", () => {
    expect(formatCells(999, "tys.")).toBe("999");
  });
});

describe("elapsed", () => {
  const start = "2026-09-22T10:00:00.000Z";

  it("dla zlecenia W TOKU liczy do teraz", () => {
    const now = new Date("2026-09-22T10:00:45.000Z").getTime();
    expect(elapsed(start, null, now)).toBe("45 s");
  });

  it("dla zakończonego liczy do znacznika końca — nie rośnie przy renderze", () => {
    // Regresja: wcześniej czas ukończonej symulacji rósł w nieskończoność.
    const end = "2026-09-22T11:30:00.000Z";
    const first = elapsed(start, end, new Date("2026-09-22T12:00:00Z").getTime());
    const later = elapsed(start, end, new Date("2026-09-23T12:00:00Z").getTime());
    expect(first).toBe(later);
    expect(first).toBe("1 h 30 min");
  });

  it("minuty z sekundami poniżej godziny", () => {
    expect(elapsed(start, "2026-09-22T10:05:07.000Z")).toBe("5 min 7 s");
  });

  it("bez znacznika startu nie zgaduje", () => {
    expect(elapsed(null)).toBe("—");
  });

  it("nie pokazuje czasu ujemnego przy rozjeździe zegarów", () => {
    expect(elapsed(start, "2026-09-22T09:00:00.000Z")).toBe("0 s");
  });
});

describe("rozmiary", () => {
  it("dobiera jednostkę do wielkości", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2.0 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatSize(3 * 1024 ** 3)).toBe("3.00 GB");
  });

  it("brak rozmiaru to myślnik, nie zero", () => {
    expect(formatSize(null)).toBe("—");
  });

  it("suma paczki oznacza tyldą, gdy magazyn nie podał wszystkich rozmiarów", () => {
    const partial = totalSize([{ size: 1024 }, { size: null }]);
    expect(partial?.partial).toBe(true);
    expect(partial?.label.startsWith("~")).toBe(true);
  });

  it("pełna suma idzie bez tyldy", () => {
    const full = totalSize([{ size: 1024 }, { size: 1024 }]);
    expect(full?.partial).toBe(false);
    expect(full?.label).toBe("2.0 KB");
  });

  it("gdy żaden plik nie ma rozmiaru, nie wymyślamy sumy", () => {
    expect(totalSize([{ size: null }])).toBe(null);
    expect(totalSize([])).toBe(null);
  });

  it("etykieta paczki jest okrągła", () => {
    expect(packageLabel(2 * 1024 ** 3)).toBe("2 GB");
    expect(packageLabel(500 * 1024 * 1024)).toBe("500 MB");
  });
});

describe("krok czasowy i czas trwania", () => {
  it("milisekundy przy małym kroku, sekundy przy dużym", () => {
    expect(formatDt(1.5)).toBe("1.500 s");
    expect(formatDt(0.05)).toBe("50.0 ms");
    expect(formatDt(0.0012)).toBe("1.20 ms");
    expect(formatDt(null)).toBe("—");
  });

  it("czas trwania skaluje jednostkę", () => {
    expect(formatDuration(30)).toBe("30 s");
    expect(formatDuration(90)).toBe("2 min");
    expect(formatDuration(7200)).toBe("2.0 h");
  });

  it("rozbicie na liczbę i jednostkę zgadza się z formatDuration", () => {
    for (const sec of [30, 90, 7200]) {
      const { value, unit } = splitDuration(sec);
      expect(formatDuration(sec)).toBe(`${value} ${unit}`);
    }
  });
});

describe("prognoza pozostałego czasu", () => {
  it("połowa drogi w minutę → została minuta", () => {
    expect(remainingSec(50, 60)).toBe(60);
  });

  it("poniżej 1% NIE zgaduje — tempo jest jeszcze przypadkowe", () => {
    // Na rozruchu maszyny prognoza z sufitu byłaby gorsza niż jej brak.
    expect(remainingSec(0.5, 60)).toBe(null);
    expect(remainingSec(1, 60)).toBe(null);
  });

  it("bez danych wejściowych oddaje null", () => {
    expect(remainingSec(null, 60)).toBe(null);
    expect(remainingSec(50, null)).toBe(null);
  });

  it("na końcu nie schodzi poniżej zera", () => {
    expect(remainingSec(100, 3600)).toBe(0);
  });
});

describe("rozpoznawanie plików wynikowych", () => {
  it("mapuje rozszerzenia na klucze tłumaczeń", () => {
    expect(fileTypeKey("pozar.smv")).toBe("smv");
    expect(fileTypeKey("pozar_devc.csv")).toBe("csv");
    expect(fileTypeKey("pozar.prt5")).toBe("prt5");
    expect(fileTypeKey("model.fds")).toBe("fds");
  });

  it("nieznane rozszerzenie trafia do „other”, a nie wywraca widoku", () => {
    expect(fileTypeKey("cokolwiek.xyz")).toBe("other");
    expect(fileTypeKey("bez_rozszerzenia")).toBe("other");
  });
});
