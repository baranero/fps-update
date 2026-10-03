import { describe, expect, it } from "vitest";
import { CAPABILITY_IMPACT, ENV_VARS, checkEnv } from "@/lib/env";

/** Komplet zmiennych wymaganych — środowisko „wszystko ustawione". */
function fullEnv(): Record<string, string> {
  return Object.fromEntries(ENV_VARS.filter((v) => v.required).map((v) => [v.name, "x"]));
}

describe("rejestr zmiennych", () => {
  it("każda zmienna ma opis, po co jest", () => {
    for (const v of ENV_VARS) {
      expect(v.purpose.length).toBeGreaterThan(10);
    }
  });

  it("nazwy się nie powtarzają", () => {
    const names = ENV_VARS.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("każdy obszar ma opisany skutek braku konfiguracji", () => {
    for (const v of ENV_VARS) {
      expect(CAPABILITY_IMPACT[v.capability]).toBeTruthy();
    }
  });

  it("do przeglądarki trafiają wyłącznie zmienne z przedrostkiem NEXT_PUBLIC_", () => {
    // Regresja na sekrety: klucz serwisowy Supabase, token dostawcy maszyn,
    // sekrety Stripe'a i webhooków nie mogą stać się publiczne przez literówkę.
    const sekrety = ["SUPABASE_SERVICE_ROLE_KEY", "HETZNER_API_TOKEN", "STRIPE_SECRET_KEY",
                     "STRIPE_WEBHOOK_SECRET", "WEBHOOK_SECRET", "CRON_SECRET", "RESEND_API_KEY"];
    for (const name of sekrety) {
      expect(ENV_VARS.some((v) => v.name === name)).toBe(true);
      expect(name.startsWith("NEXT_PUBLIC_")).toBe(false);
    }
  });
});

describe("raport gotowości", () => {
  it("komplet zmiennych = wszystkie obszary gotowe", () => {
    for (const r of checkEnv(fullEnv())) {
      expect(r.ready).toBe(true);
      expect(r.missingRequired).toEqual([]);
    }
  });

  it("puste środowisko blokuje każdy obszar", () => {
    for (const r of checkEnv({})) expect(r.ready).toBe(false);
  });

  it("brak kluczy Stripe blokuje TYLKO płatności", () => {
    const env = fullEnv();
    delete env.STRIPE_SECRET_KEY;
    delete env.STRIPE_WEBHOOK_SECRET;
    const reports = checkEnv(env);
    expect(reports.find((r) => r.capability === "payments")?.ready).toBe(false);
    for (const r of reports.filter((r) => r.capability !== "payments")) {
      expect(r.ready).toBe(true);
    }
  });

  it("pusty napis i same spacje liczą się jako brak", () => {
    // Na Vercelu łatwo zapisać zmienną bez wartości — to nie jest konfiguracja.
    for (const pusta of ["", "   "]) {
      const env = { ...fullEnv(), CRON_SECRET: pusta };
      expect(checkEnv(env).find((r) => r.capability === "ops")?.ready).toBe(false);
    }
  });

  it("zmienne nieobowiązkowe nie blokują obszaru", () => {
    const env = fullEnv(); // zawiera wyłącznie wymagane
    const compute = checkEnv(env).find((r) => r.capability === "compute")!;
    expect(compute.ready).toBe(true);
    expect(compute.missingOptional.length).toBeGreaterThan(0);
  });
});
