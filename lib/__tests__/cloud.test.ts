import { describe, expect, it } from "vitest";
import { CLOUD_PATHS, LEGACY_PATHS, isCloudPath, legacyTarget } from "@/lib/cloud";

// Mapa ścieżek rozdziela DWA projekty Vercel stojące na jednym repo. Pomyłka tutaj
// nie wywala builda — wysyła żywy ruch 301 na drugą domenę, gdzie strony nie ma.
// Wcześniej ta sama lista istniała w dwóch plikach (middleware miał własną kopię),
// więc rozjazd był kwestią czasu; te testy pilnują już jednego źródła.

describe("ścieżki chmury", () => {
  it("rozpoznaje przestrzeń konta razem z podstronami", () => {
    expect(isCloudPath("/symulacje")).toBe(true);
    expect(isCloudPath("/symulacje/nowa")).toBe(true);
    expect(isCloudPath("/symulacje/FDS-ABC-1234")).toBe(true);
    expect(isCloudPath("/symulacje/admin")).toBe(true);
  });

  it("zostawia witrynę usługową po stronie marketingu", () => {
    for (const p of ["/", "/cfd", "/operat", "/blog", "/kontakt", "/narzedzia", "/narzedzia/kalkulatory"]) {
      expect(isCloudPath(p)).toBe(false);
    }
  });

  it("nie łapie ścieżek o wspólnym przedrostku", () => {
    // „/cennikowy" nie jest „/cennik" — dopasowanie musi iść po segmencie,
    // a nie po samym startsWith.
    expect(isCloudPath("/cennikowy")).toBe(false);
    expect(isCloudPath("/symulacje-cfd-w-oddymianiu-klatek-schodowych")).toBe(false);
  });

  it("blog należy do witryny usługowej, baza wiedzy do chmury", () => {
    expect(isCloudPath("/blog")).toBe(false);
    expect(isCloudPath("/baza-wiedzy")).toBe(true);
  });

  it("każda zadeklarowana ścieżka chmury przechodzi własny test", () => {
    for (const p of CLOUD_PATHS) expect(isCloudPath(p)).toBe(true);
  });
});

describe("stare adresy konta", () => {
  it("prowadzą do dzisiejszego miejsca w chmurze", () => {
    expect(legacyTarget("/narzedzia/profil")).toBe("/symulacje/profil");
    expect(legacyTarget("/narzedzia/admin")).toBe("/symulacje/admin");
    expect(legacyTarget("/narzedzia/symulacje")).toBe("/symulacje");
  });

  it("zachowują segmenty pod spodem — numer zlecenia niesie e-mail", () => {
    expect(legacyTarget("/narzedzia/symulacje/FDS-ABC-1234")).toBe("/symulacje/FDS-ABC-1234");
    expect(legacyTarget("/narzedzia/symulacje/historia")).toBe("/symulacje/historia");
  });

  it("nie ruszają kalkulatorów — te zostają na witrynie usługowej", () => {
    expect(legacyTarget("/narzedzia")).toBe(null);
    expect(legacyTarget("/narzedzia/kalkulatory")).toBe(null);
    expect(legacyTarget("/narzedzia/kalkulatory/cnbop")).toBe(null);
  });

  it("cel przekierowania sam jest ścieżką chmury — inaczej 301 odbijałby w kółko", () => {
    for (const target of Object.values(LEGACY_PATHS)) {
      expect(isCloudPath(target)).toBe(true);
      expect(legacyTarget(target)).toBe(null);
    }
  });

  it("stary adres liczy się do chmury, żeby przekierował go właściwy projekt", () => {
    for (const from of Object.keys(LEGACY_PATHS)) expect(isCloudPath(from)).toBe(true);
  });
});
