import { describe, expect, it } from "vitest";
import {
  ACCESS_NOTE_MAX, ANONYMOUS_ACCESS, SIM_ACCESS_VALUES, accessState,
  canRequestAccess, canRunSimulations, isSimAccess, toSimAccess,
} from "@/lib/access";

// Ta bramka rozstrzyga, kto może uruchomić maszynę obliczeniową liczoną
// w realnych pieniądzach, a rozliczaną dopiero PO obliczeniach. Każdy błąd
// „na tak" to cudzy rachunek u dostawcy, więc reguła ma własne testy.

describe("odczyt stanu z bazy", () => {
  it("rozpoznaje wszystkie znane stany", () => {
    for (const v of SIM_ACCESS_VALUES) {
      expect(isSimAccess(v)).toBe(true);
      expect(toSimAccess(v)).toBe(v);
    }
  });

  it("nieznana wartość znaczy BRAK dostępu, nigdy dostęp", () => {
    // Literówka w bazie, null z nieuruchomionej migracji, obcy string —
    // wszystko to musi wypaść na „none".
    for (const v of [null, undefined, "", "GRANTED", "admin", 1, true, {}, []]) {
      expect(isSimAccess(v)).toBe(false);
      expect(toSimAccess(v)).toBe("none");
      expect(canRunSimulations({ isAdmin: false, access: toSimAccess(v) })).toBe(false);
    }
  });
});

describe("kto może uruchamiać", () => {
  it("właściciel zawsze — niezależnie od stanu konta", () => {
    for (const access of SIM_ACCESS_VALUES) {
      expect(canRunSimulations({ isAdmin: true, access })).toBe(true);
    }
  });

  it("klient wyłącznie po zgodzie właściciela", () => {
    expect(canRunSimulations({ isAdmin: false, access: "granted" })).toBe(true);
    expect(canRunSimulations({ isAdmin: false, access: "none" })).toBe(false);
    expect(canRunSimulations({ isAdmin: false, access: "requested" })).toBe(false);
    expect(canRunSimulations({ isAdmin: false, access: "blocked" })).toBe(false);
  });

  it("sama prośba niczego nie otwiera", () => {
    // Regresja na wypadek, gdyby ktoś kiedyś uznał „requested" za stan przejściowy
    // z domyślnym tak — to jest stan OCZEKIWANIA, nie zgody.
    expect(canRunSimulations({ isAdmin: false, access: "requested" })).toBe(false);
  });
});

describe("kto może prosić o dostęp", () => {
  it("tylko konto, które jeszcze nie prosiło", () => {
    expect(canRequestAccess("none")).toBe(true);
    expect(canRequestAccess("requested")).toBe(false);
    expect(canRequestAccess("granted")).toBe(false);
  });

  it("odmowa jest ostateczna — zablokowany nie prosi ponownie", () => {
    expect(canRequestAccess("blocked")).toBe(false);
  });
});

describe("stan dla interfejsu", () => {
  it("gość nie może ani uruchomić, ani poprosić", () => {
    expect(ANONYMOUS_ACCESS.signedIn).toBe(false);
    expect(ANONYMOUS_ACCESS.canRun).toBe(false);
    expect(ANONYMOUS_ACCESS.canRequest).toBe(false);
  });

  it("nowe konto widzi przycisk prośby", () => {
    const s = accessState({ isAdmin: false, access: "none" });
    expect(s).toMatchObject({ signedIn: true, canRun: false, canRequest: true });
  });

  it("konto z dostępem nie widzi już prośby", () => {
    const s = accessState({ isAdmin: false, access: "granted" });
    expect(s.canRun).toBe(true);
    expect(s.canRequest).toBe(false);
  });

  it("właściciel nie prosi sam siebie", () => {
    const s = accessState({ isAdmin: true, access: "none" });
    expect(s.canRun).toBe(true);
    expect(s.canRequest).toBe(false);
  });
});

describe("uzasadnienie prośby", () => {
  it("ma limit długości, który da się zapisać w kolumnie tekstowej", () => {
    expect(ACCESS_NOTE_MAX).toBeGreaterThan(100);
    expect(ACCESS_NOTE_MAX).toBeLessThanOrEqual(2000);
  });
});
