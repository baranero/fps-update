import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_PROBES, isMissingSchemaError, probesByMigration } from "@/lib/dbChecks";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase");

function migrationFiles(): string[] {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.startsWith("migration_") && f.endsWith(".sql"));
}

// Rejestr sond jest wart tyle, ile jego kompletność: migracja bez sondy wymyka
// się kontroli `npm run sprawdz-baze` i wraca dokładnie tym samym problemem,
// dla którego ten rejestr powstał — cichym rozjazdem bazy z kodem.

describe("spójność rejestru z katalogiem migracji", () => {
  it("każda sonda wskazuje istniejący plik migracji", () => {
    const istnieje = new Set(migrationFiles());
    for (const p of SCHEMA_PROBES) {
      expect(istnieje.has(p.migration), `brak pliku supabase/${p.migration}`).toBe(true);
    }
  });

  it("każda migracja ma co najmniej jedną sondę", () => {
    const pokryte = probesByMigration();
    // maintenance_* to jednorazowe porządki, nie zmiany schematu — świadomie poza.
    const bezSondy = migrationFiles().filter((f) => !pokryte.has(f));
    expect(bezSondy, `migracje bez sondy: ${bezSondy.join(", ")}`).toEqual([]);
  });

  it("sonda kolumny podaje kolumnę, sonda tabeli i funkcji — nie", () => {
    for (const p of SCHEMA_PROBES) {
      if (p.kind === "column") expect(p.column, `${p.migration}: brak kolumny`).toBeTruthy();
      else expect(p.column, `${p.migration}: kolumna przy sondzie ${p.kind}`).toBeUndefined();
    }
  });

  it("każda sonda mówi, co przestaje działać", () => {
    for (const p of SCHEMA_PROBES) expect(p.impact.length).toBeGreaterThan(20);
  });
});

describe("rozpoznawanie braku elementu w schemacie", () => {
  it("łapie komunikaty Postgresa i PostgREST", () => {
    // Dokładnie ten komunikat wywrócił pierwsze uruchomienie migracji sim_access.
    expect(isMissingSchemaError('relation "public.job_events" does not exist')).toBe(true);
    expect(isMissingSchemaError('column profiles.sim_access does not exist')).toBe(true);
    expect(isMissingSchemaError("Could not find the 'sim_access' column of 'profiles' in the schema cache")).toBe(true);
  });

  it("nie myli braku elementu z innym błędem", () => {
    // Odmowa uprawnień albo padnięta sieć to NIE jest nieuruchomiona migracja —
    // skrypt musi je pokazać osobno, zamiast kazać uruchamiać migracje na ślepo.
    expect(isMissingSchemaError("permission denied for table profiles")).toBe(false);
    expect(isMissingSchemaError("fetch failed")).toBe(false);
    expect(isMissingSchemaError(undefined)).toBe(false);
  });
});
