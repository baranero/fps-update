// ─── Czego kod oczekuje od bazy ──────────────────────────────────────────────
//
// Migracje w supabase/ uruchamia się RĘCZNIE w SQL Editorze, więc baza potrafi
// rozjechać się z kodem po cichu: strona działa, a funkcja po prostu nie zapisuje.
// Tak było z dziennikiem zdarzeń — tabeli `job_events` nie było na wdrożeniu,
// a `logEvent()` (słusznie) milczy przy nieuruchomionej migracji, więc nic tego
// nie zgłaszało.
//
// Ten rejestr opisuje, którą migrację widać po czym w schemacie. Czyta go
// `npm run sprawdz-baze` — tak samo, jak `npm run preflight` czyta lib/env.ts.
//
// Moduł jest CZYSTY: żadnego połączenia z bazą, żadnego env. Sondowanie robi skrypt.

export type ProbeKind = "table" | "column" | "function" | "data";

/**
 * Warunek dla sondy `data`: zestaw filtrów, które po uruchomieniu migracji
 * NIE MOGĄ trafiać w żaden wiersz. Zapis jest deklaratywny, żeby rejestr został
 * czysty — zapytanie składa z tego skrypt.
 */
export type EmptyWhere = Record<string, { in?: readonly string[]; gt?: number }>;

export interface SchemaProbe {
  /** Plik migracji, który to dokłada — dokładnie to zdanie chcemy zobaczyć przy braku. */
  migration: string;
  kind: ProbeKind;
  /** Tabela (dla `table`/`column`) albo nazwa funkcji (dla `function`). */
  table: string;
  /** Kolumna — wyłącznie dla `kind: "column"`. */
  column?: string;
  /**
   * Wyłącznie dla `kind: "data"`: wiersze, których po migracji ma NIE BYĆ.
   * Migracja danych nie zostawia śladu w schemacie, więc jedynym dowodem jej
   * uruchomienia jest skutek, jaki miała wywołać.
   */
  emptyWhere?: EmptyWhere;
  /** Co przestaje działać, gdy tego nie ma. */
  impact: string;
  /**
   * Czy brak jest KRYTYCZNY (serwis nie zadziała) czy degradujący (działa
   * węziej, zwykle po cichu — i dlatego tym groźniejszy).
   */
  critical: boolean;
}

/**
 * Po jednej sondzie na migrację — reprezentatywna tabela, kolumna albo funkcja.
 * Kolejność jak w docs/wdrozenie.md, czyli w takiej, w jakiej migracje się uruchamia.
 */
export const SCHEMA_PROBES: readonly SchemaProbe[] = [
  { migration: "migration_fds_submissions.sql", kind: "table", table: "fds_submissions",
    critical: true, impact: "Bez tabeli zleceń nie działa nic: ani kreator, ani panel." },

  { migration: "migration_hetzner_columns.sql", kind: "column", table: "fds_submissions", column: "server_type",
    critical: true, impact: "Zlecenie nie zapamięta maszyny ani czasu startu — nie da się rozliczyć biegu." },

  { migration: "migration_server_plan.sql", kind: "column", table: "fds_submissions", column: "plan_tier",
    critical: false, impact: "Znika plan maszyny przy zleceniu: nie ma z czego liczyć kalibracji prognoz." },

  { migration: "migration_payments.sql", kind: "column", table: "fds_submissions", column: "payment_status",
    critical: true, impact: "Nie da się oznaczyć zlecenia jako opłaconego — webhook Stripe nie ma czego zapisać." },

  { migration: "migration_cleanup.sql", kind: "column", table: "fds_submissions", column: "results_deleted_at",
    critical: false, impact: "Cron nie odróżni wyników już skasowanych — retencja stoi w miejscu." },

  { migration: "migration_reports.sql", kind: "table", table: "reports",
    critical: false, impact: "Historia raportów z kalkulatorów nie zapisze się na koncie." },

  { migration: "migration_locale.sql", kind: "column", table: "fds_submissions", column: "locale",
    critical: false, impact: "Maile do klienta pójdą po polsku niezależnie od języka zlecenia." },

  { migration: "migration_append_fds_log.sql", kind: "function", table: "append_fds_log",
    critical: true, impact: "Maszyna nie doklei logu — strona zlecenia zostaje pusta w trakcie biegu." },

  { migration: "migration_devc_stream.sql", kind: "column", table: "fds_submissions", column: "devc_csv",
    critical: false, impact: "Nie będzie podglądu wyników na żywo (DEVC/HRR) ani przycisku zatrzymania." },

  { migration: "migration_slice_stream.sql", kind: "column", table: "fds_submissions", column: "slice_json",
    critical: false, impact: "Nie będzie podglądu przekroju w trakcie obliczeń." },

  { migration: "migration_stall_watchdog.sql", kind: "column", table: "fds_submissions", column: "last_progress_at",
    critical: true, impact: "Watchdog nie rozpozna zawisu — maszyna potrafi mielić (i kosztować) bez postępu." },

  { migration: "migration_invoice_data.sql", kind: "column", table: "profiles", column: "buyer_type",
    critical: true, impact: "Nie da się ustalić stawki VAT ani wystawić faktury zgodnej z KSeF." },

  { migration: "migration_job_events.sql", kind: "table", table: "job_events",
    critical: false, impact: "Brak dziennika zdarzeń: zlecenia zamykają się bez zapisanego POWODU niepowodzenia." },

  { migration: "migration_hrrpua.sql", kind: "column", table: "fds_submissions", column: "hrrpua",
    critical: false, impact: "Model czasu traci intensywność pożaru — prognozy będą mniej trafne." },

  { migration: "migration_price_backup.sql", kind: "column", table: "fds_submissions", column: "price_old",
    critical: false, impact: "Brak kopii cen sprzed przeliczenia cennika — nie ma do czego wrócić." },

  { migration: "migration_sim_access.sql", kind: "column", table: "profiles", column: "sim_access",
    critical: true, impact: "Bramka uruchamiania zostaje zamknięta: obliczenia odpala wyłącznie właściciel." },

  // Jedyna migracja DANYCH, nie schematu (kolumnę `price_old` dokłada
  // migration_price_backup.sql). Sprawdzamy więc jej SKUTEK: po uruchomieniu
  // żadne zlecenie zamknięte błędem nie może pokazywać kwoty — mail o
  // niepowodzeniu obiecuje klientowi wprost, że nie zostanie obciążony.
  { migration: "migration_clear_failed_price.sql", kind: "data", table: "fds_submissions",
    emptyWhere: { status: { in: ["failed", "error"] }, price: { gt: 0 } },
    critical: false,
    impact: "Zlecenia zakończone błędem wciąż pokazują należność, której nikt nie pobierze." },
] as const;

/** Nazwa migracji → jej sondy (jedna migracja może mieć ich w przyszłości kilka). */
export function probesByMigration(): Map<string, SchemaProbe[]> {
  const out = new Map<string, SchemaProbe[]>();
  for (const p of SCHEMA_PROBES) {
    const list = out.get(p.migration) ?? [];
    list.push(p);
    out.set(p.migration, list);
  }
  return out;
}

/** Czy komunikat z PostgREST/Postgresa znaczy „tego nie ma w schemacie". */
export function isMissingSchemaError(message: string | undefined): boolean {
  if (!message) return false;
  return /does not exist|could not find|schema cache|relation .* does not exist/i.test(message);
}
