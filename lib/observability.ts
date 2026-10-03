// ─── Dziennik zdarzeń zlecenia ───────────────────────────────────────────────
//
// Do tej pory całą wiedzę o tym, co poszło nie tak, niósł `console.error` na
// Vercelu — czyli nic, co da się przeszukać po dwóch dniach. Zlecenie wpadało
// w `failed` w pięciu różnych miejscach i żadne nie zapisywało powodu.
// Na 36 nieudanych biegów dziewięć najdroższych nie dało się zdiagnozować
// w ogóle: pusty kod wyjścia, log urwany w połowie poprawnych obliczeń.
//
// Reguły tego modułu:
//   • NIGDY nie rzuca — zapis dziennika nie ma prawa wywrócić zlecenia,
//   • pisze też na konsolę, w jednej linii i zawsze w tym samym kształcie,
//     żeby dało się filtrować logi Vercela po `case_id`,
//   • nie zna Reacta ani żądania — wołają go trasy API i cron.

import { createAdminClient } from "@/lib/supabase/server";

export type EventLevel = "info" | "warn" | "error";

/** Etap ścieżki zlecenia. Zgodny z CHECK w migration_job_events.sql. */
export type EventStage =
  | "submit"
  | "dispatch"
  | "run"
  | "complete"
  | "watchdog"
  | "cleanup"
  | "payment"
  | "invoice"
  // Zdarzenia konta, nie zlecenia — prośba o dostęp i decyzja właściciela.
  // Jedyny etap zapisywany bez `caseId`.
  | "access";

/**
 * Powód niepowodzenia — zamknięty zbiór, bo po to jest, żeby go ZLICZAĆ.
 * Wolny tekst idzie do `detail`.
 */
export type FailureReason =
  | "fds_error"
  | "fds_exit"
  | "stalled"
  | "dispatch_timeout"
  | "vm_missing"
  | "vm_boot_failed"
  | "cancelled_by_user"
  | "unknown";

export interface JobEvent {
  caseId?: string | null;
  level?: EventLevel;
  stage: EventStage;
  message: string;
  meta?: Record<string, unknown>;
}

/** Czy brak tabeli/kolumny — wtedy milczymy, bo to tylko nieuruchomiona migracja. */
function isMissingSchema(message: string | undefined): boolean {
  if (!message) return false;
  return /relation .* does not exist|column .* does not exist|could not find the .* column|schema cache/i.test(message);
}

/**
 * Zapisuje zdarzenie. Nie czekaj na wynik w ścieżce krytycznej — to celowo
 * `void`, a nie `Promise` do odhaczenia.
 */
export async function logEvent(event: JobEvent): Promise<void> {
  const level = event.level ?? "info";

  // Konsola zawsze — nawet gdy baza odmówi, ślad zostaje w logach wdrożenia.
  const line = `[${event.stage}]${event.caseId ? ` [${event.caseId}]` : ""} ${event.message}`;
  if (level === "error") console.error(line, event.meta ?? "");
  else if (level === "warn") console.warn(line, event.meta ?? "");
  else console.log(line, event.meta ?? "");

  try {
    const { error } = await createAdminClient().from("job_events").insert({
      case_id: event.caseId ?? null,
      level,
      stage: event.stage,
      message: event.message.slice(0, 2000),
      meta: event.meta ?? null,
    });
    if (error && !isMissingSchema(error.message)) {
      console.error("dziennik: zapis nieudany:", error.message);
    }
  } catch (err) {
    // Świadomie połykamy — dziennik nie może przewrócić zlecenia.
    console.error("dziennik: wyjątek przy zapisie:", err);
  }
}

/**
 * Zamyka zlecenie jako nieudane, ZAPISUJĄC POWÓD.
 *
 * To jedyna droga do statusu `failed` — po to, żeby nie dało się już zamknąć
 * zlecenia bez śladu, jak działo się to w czterech gałęziach crona.
 * Kolumny powodu przybywają z migracją, więc przy jej braku zapis schodzi do
 * samego statusu, a zlecenie i tak zostaje poprawnie zamknięte.
 */
export async function failJob(opts: {
  caseId: string;
  reason: FailureReason;
  detail?: string;
  stage: EventStage;
  meta?: Record<string, unknown>;
  /** Znacznik zakończenia; domyślnie teraz. */
  at?: Date;
}): Promise<void> {
  const supabase = createAdminClient();
  const completedAt = (opts.at ?? new Date()).toISOString();

  // Cena schodzi do zera razem ze statusem. W `price` siedzi wycena wstepna
  // zapisana przy zgloszeniu, a mail o niepowodzeniu obiecuje wprost, ze klient
  // nie zostanie obciazony. Zostawiona kwota pokazywala sie potem przy zleceniu
  // w Rozliczeniach jako naleznosc, ktorej nikt nigdy nie mial pobrac.
  //
  // Panel marzy na tym nie traci: koszt spalonych biegow liczy z czasu zycia
  // maszyny (lib/fds/margin.ts), nie z ceny.
  const full = {
    status: "failed",
    completed_at: completedAt,
    failure_reason: opts.reason,
    failure_detail: opts.detail ?? null,
    price: 0,
  };

  let { error } = await supabase.from("fds_submissions").update(full).eq("case_id", opts.caseId);

  if (error && isMissingSchema(error.message)) {
    ({ error } = await supabase
      .from("fds_submissions")
      .update({ status: "failed", completed_at: completedAt, price: 0 })
      .eq("case_id", opts.caseId));
    console.error(
      `failJob [${opts.caseId}]: brak kolumn powodu — uruchom supabase/migration_job_events.sql`
    );
  }

  if (error) console.error(`failJob [${opts.caseId}]: zapis nieudany:`, error.message);

  await logEvent({
    caseId: opts.caseId,
    level: "error",
    stage: opts.stage,
    message: `Zlecenie zamknięte jako nieudane: ${opts.reason}${opts.detail ? ` — ${opts.detail}` : ""}`,
    meta: { reason: opts.reason, ...opts.meta },
  });
}

// ─── Opis powodu dla człowieka ───────────────────────────────────────────────
//
// Trzymane tutaj, a nie w i18n, bo czyta je panel admina i dziennik — to język
// operacyjny, nie copy klienckie. Karta zlecenia tłumaczy przerwanie klientowi
// osobno, przez lib/fds/errors.ts.
export const FAILURE_LABEL: Record<FailureReason, string> = {
  fds_error: "Błąd krytyczny FDS w logu",
  fds_exit: "Niezerowy kod wyjścia FDS",
  stalled: "Brak postępu — zatrzymane przez nadzorcę",
  dispatch_timeout: "Maszyna nie ruszyła w wyznaczonym czasie",
  vm_missing: "Maszyna zniknęła",
  vm_boot_failed: "Nie udało się utworzyć maszyny",
  cancelled_by_user: "Anulowane przez użytkownika",
  unknown: "Nieustalony",
};

/** Czy powód obciąża nas, czy plik wejściowy klienta — po tym liczy się jakość usługi. */
export const OUR_FAULT: Record<FailureReason, boolean> = {
  fds_error: false,        // błąd w modelu klienta
  fds_exit: true,
  stalled: true,
  dispatch_timeout: true,
  vm_missing: true,
  vm_boot_failed: true,
  cancelled_by_user: false,
  unknown: true,           // dopóki nie wiemy, liczymy na swoje konto
};
