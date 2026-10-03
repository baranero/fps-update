export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteResults } from "@/lib/hetzner/storage";
import { caseModelPaths } from "@/lib/fds/runFile";
import { getServer, deleteServer } from "@/lib/hetzner/client";
import { DISPATCH_TIMEOUT_H, STALL_HOURS, hasAdvanced, progressMark } from "@/lib/fds/watchdog";
import { failJob, logEvent } from "@/lib/observability";

const RETENTION_DAYS = 60;
/** Ile trzymamy dziennik zdarzeń — dłużej i tak nie diagnozujemy. */
const EVENT_RETENTION_DAYS = 90;

// Progi zawisu żyją w lib/fds/watchdog.ts — korzysta z nich także strona
// zlecenia, żeby tłumaczyć przerwanie tą samą regułą, która je wywołała.
const HUNG_DISPATCHED_H = DISPATCH_TIMEOUT_H;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = { cleaned: 0, hung_resolved: 0, errors: [] as string[] };

  // ── 1. Cleanup plików starszych niż RETENTION_DAYS ──────────────────────────
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();

  const { data: toClean, error: cleanErr } = await supabase
    .from("fds_submissions")
    .select("case_id, file_path")
    .in("status", ["done", "failed", "cancelled"])
    .lt("completed_at", cutoff)
    .is("results_deleted_at", null);

  if (cleanErr) {
    results.errors.push(`cleanup query: ${cleanErr.message}`);
  } else if (toClean) {
    for (const row of toClean) {
      try {
        // Usuń wyniki z Hetzner Object Storage
        await deleteResults(row.case_id);

        // Usuń plik wejściowy .fds z Supabase Storage — wraz z kopią
        // uruchomieniową, jeśli powstała (przypisanie siatek do procesów).
        const paths = caseModelPaths(row.file_path);
        if (paths.length) {
          await supabase.storage.from("fds-files").remove(paths);
        }

        // Oznacz jako wyczyszczone
        await supabase
          .from("fds_submissions")
          .update({ results_deleted_at: now.toISOString() })
          .eq("case_id", row.case_id);

        results.cleaned++;
      } catch (err) {
        results.errors.push(`cleanup ${row.case_id}: ${String(err)}`);
      }
    }
  }

  // ── 2. Wykrywanie i rozwiązywanie zawieszonych jobów ────────────────────────

  // 2a. "dispatched" ale VM nie odpowiedział w ciągu HUNG_DISPATCHED_H
  const dispatchedCutoff = new Date(now.getTime() - HUNG_DISPATCHED_H * 3600 * 1000).toISOString();
  const { data: hungDispatched } = await supabase
    .from("fds_submissions")
    .select("case_id, server_id")
    .eq("status", "dispatched")
    .lt("dispatched_at", dispatchedCutoff);

  for (const row of hungDispatched ?? []) {
    try {
      if (!row.server_id) {
        // Dispatch w ogóle nie utworzył maszyny.
        await failJob({
          caseId: row.case_id, reason: "vm_boot_failed", stage: "watchdog",
          detail: `brak server_id po ${HUNG_DISPATCHED_H} h od wysyłki`,
          at: now,
        });
        results.hung_resolved++;
        continue;
      }

      const server = await getServer(row.server_id);
      if (!server) {
        // Maszyny już nie ma — nie ma czego ubijać, ale trzeba to odnotować.
        await failJob({
          caseId: row.case_id, reason: "vm_missing", stage: "watchdog",
          detail: "maszyna zniknęła przed przejściem w obliczenia",
          meta: { serverId: row.server_id }, at: now,
        });
      } else {
        // Maszyna żyje, ale po HUNG_DISPATCHED_H nadal nie liczy — boot padł.
        await deleteServer(row.server_id).catch(() => {});
        await failJob({
          caseId: row.case_id, reason: "dispatch_timeout", stage: "watchdog",
          detail: `maszyna nie zgłosiła startu obliczeń przez ${HUNG_DISPATCHED_H} h`,
          meta: { serverId: row.server_id }, at: now,
        });
      }
      results.hung_resolved++;
    } catch (err) {
      results.errors.push(`hung dispatched ${row.case_id}: ${String(err)}`);
      await logEvent({
        caseId: row.case_id, level: "error", stage: "watchdog",
        message: "Wyjątek przy rozwiązywaniu zawieszonej wysyłki",
        meta: { error: String(err) },
      });
    }
  }

  // 2b. "running", które STANĘŁO W MIEJSCU
  //
  // Nie patrzymy, jak długo trwają obliczenia — wolna symulacja jest zdrowa,
  // a za niski szacunek to nasz błąd wyceny, nie powód do kasowania cudzej
  // pracy. Przy każdym przebiegu zapisujemy ślad postępu (czas symulacji z logu
  // i długość logu). Dopiero gdy nic nie drgnie przez STALL_HOURS, zwalniamy
  // maszynę — bo wtedy naprawdę nic już nie liczy.
  const { data: hungRunning, error: runningErr } = await supabase
    .from("fds_submissions")
    .select("case_id, server_id, started_at, fds_log, last_sim_time, last_log_bytes, last_progress_at")
    .eq("status", "running")
    .not("started_at", "is", null);

  if (runningErr) {
    // Najczęstsza przyczyna: nieuruchomiona supabase/migration_stall_watchdog.sql.
    // Nie zgadujemy wtedy niczego z samego czasu trwania — brak nadzoru jest
    // tańszy niż ubicie poprawnych obliczeń.
    results.errors.push(
      `hung running: ${runningErr.message} — sprawdź, czy wykonano supabase/migration_stall_watchdog.sql`
    );
  }

  for (const row of hungRunning ?? []) {
    try {
      const mark = progressMark(row.fds_log);
      const advanced = hasAdvanced(
        row.last_progress_at
          ? { simTime: row.last_sim_time ?? null, logBytes: row.last_log_bytes ?? 0 }
          : null,
        mark
      );

      // Cokolwiek drgnęło — zapamiętaj nowy ślad i zostaw zlecenie w spokoju.
      if (advanced) {
        await supabase
          .from("fds_submissions")
          .update({
            last_sim_time: mark.simTime,
            last_log_bytes: mark.logBytes,
            last_progress_at: now.toISOString(),
          })
          .eq("case_id", row.case_id);
        continue;
      }

      // Punktem odniesienia jest ostatni zaobserwowany postęp, a przy pierwszym
      // przebiegu po wdrożeniu — start obliczeń.
      const since = row.last_progress_at ?? row.started_at;
      const stalledH = (now.getTime() - new Date(since).getTime()) / 3600_000;
      if (!Number.isFinite(stalledH) || stalledH < STALL_HOURS) continue;

      // Maszyna nie istnieje (crash, OOM, ręczne usunięcie) — nie ma czego ubijać.
      const server = row.server_id ? await getServer(row.server_id) : null;
      if (row.server_id && server) {
        await deleteServer(row.server_id).catch(() => {});
      }

      // Rozróżnienie, którego brakowało: czy solver stanął przy żywej maszynie
      // (zawis), czy maszyna zniknęła nam spod obliczeń (awaria infrastruktury).
      // Obie sytuacje wyglądały dotąd identycznie: status `failed` i pusty log.
      await failJob({
        caseId: row.case_id,
        reason: row.server_id && !server ? "vm_missing" : "stalled",
        stage: "watchdog",
        detail:
          row.server_id && !server
            ? `maszyna zniknęła; ostatni postęp ${stalledH.toFixed(1)} h temu`
            : `brak postępu przez ${stalledH.toFixed(1)} h (próg ${STALL_HOURS} h)`,
        meta: {
          serverId: row.server_id,
          stalledHours: Number(stalledH.toFixed(2)),
          lastSimTime: row.last_sim_time,
          logBytes: mark.logBytes,
        },
        at: now,
      });
      results.hung_resolved++;
    } catch (err) {
      results.errors.push(`hung running ${row.case_id}: ${String(err)}`);
      await logEvent({
        caseId: row.case_id, level: "error", stage: "watchdog",
        message: "Wyjątek przy nadzorze obliczeń",
        meta: { error: String(err) },
      });
    }
  }

  // ── 3. Retencja dziennika zdarzeń ───────────────────────────────────────────
  const eventCutoff = new Date(now.getTime() - EVENT_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  const { error: eventsErr } = await supabase.from("job_events").delete().lt("at", eventCutoff);
  if (eventsErr && !/does not exist|schema cache/i.test(eventsErr.message)) {
    results.errors.push(`job_events retention: ${eventsErr.message}`);
  }

  // Ślad każdego przebiegu — bez niego nie wiadomo nawet, czy cron w ogóle
  // chodzi. Przy pustym przebiegu nie zaśmiecamy dziennika.
  const touched = results.cleaned + results.hung_resolved + results.errors.length;
  if (touched > 0) {
    await logEvent({
      level: results.errors.length ? "warn" : "info",
      stage: "cleanup",
      message: `Przebieg crona: wyczyszczono ${results.cleaned}, zamknięto zawieszonych ${results.hung_resolved}, błędów ${results.errors.length}`,
      meta: results,
    });
  }

  console.log("Cron cleanup:", results);
  return NextResponse.json(results);
}
