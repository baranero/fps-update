export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteResults } from "@/lib/hetzner/storage";
import { getServer, deleteServer } from "@/lib/hetzner/client";

const RETENTION_DAYS = 60;

// Jak długo job może siedzieć w danym statusie zanim uznamy go za zawisły
const HUNG_DISPATCHED_H = 2;   // 2h bez przejścia w "running" = coś poszło nie tak
const HUNG_RUNNING_MULT = 3;   // 3x szacowany wall_hours = zawis (np. 10h job = max 30h)
const HUNG_RUNNING_MIN_H = 6;  // minimum 6h od started_at zanim uznamy za zawisły

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

        // Usuń plik wejściowy .fds z Supabase Storage
        if (row.file_path) {
          await supabase.storage.from("fds-files").remove([row.file_path]);
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
      if (row.server_id) {
        const server = await getServer(row.server_id);
        if (!server) {
          // VM już nie istnieje — oznacz jako failed
          await supabase
            .from("fds_submissions")
            .update({ status: "failed", completed_at: now.toISOString() })
            .eq("case_id", row.case_id);
          results.hung_resolved++;
        }
        // Jeśli VM istnieje ale boot trwa > 2h — coś poważnego, usuń VM
        else {
          await deleteServer(row.server_id).catch(() => {});
          await supabase
            .from("fds_submissions")
            .update({ status: "failed", completed_at: now.toISOString() })
            .eq("case_id", row.case_id);
          results.hung_resolved++;
        }
      } else {
        // Brak server_id — dispatch nie zadziałał, zamknij job
        await supabase
          .from("fds_submissions")
          .update({ status: "failed", completed_at: now.toISOString() })
          .eq("case_id", row.case_id);
        results.hung_resolved++;
      }
    } catch (err) {
      results.errors.push(`hung dispatched ${row.case_id}: ${String(err)}`);
    }
  }

  // 2b. "running" ale trwa znacznie dłużej niż szacowany czas
  const { data: hungRunning } = await supabase
    .from("fds_submissions")
    .select("case_id, server_id, wall_hours, started_at")
    .eq("status", "running")
    .not("started_at", "is", null);

  for (const row of hungRunning ?? []) {
    const startedAt = new Date(row.started_at);
    const elapsedH = (now.getTime() - startedAt.getTime()) / 3600_000;
    const expectedMax = Math.max(HUNG_RUNNING_MIN_H, (row.wall_hours ?? 1) * HUNG_RUNNING_MULT);

    if (elapsedH < expectedMax) continue;

    try {
      if (row.server_id) {
        const server = await getServer(row.server_id);
        if (!server) {
          // VM już nie istnieje (crash, OOM) — oznacz jako failed
          await supabase
            .from("fds_submissions")
            .update({ status: "failed", completed_at: now.toISOString() })
            .eq("case_id", row.case_id);
          results.hung_resolved++;
        } else {
          // VM żyje ale job zawisł — kill VM, oznacz jako failed
          await deleteServer(row.server_id).catch(() => {});
          await supabase
            .from("fds_submissions")
            .update({ status: "failed", completed_at: now.toISOString() })
            .eq("case_id", row.case_id);
          results.hung_resolved++;
        }
      }
    } catch (err) {
      results.errors.push(`hung running ${row.case_id}: ${String(err)}`);
    }
  }

  console.log("Cron cleanup:", results);
  return NextResponse.json(results);
}
