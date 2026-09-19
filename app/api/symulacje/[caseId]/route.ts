export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { listResults, signedResultUrl, deleteResults, isInternalResult } from "@/lib/hetzner/storage";
import { deleteServer } from "@/lib/hetzner/client";
import { requireCaseAccess } from "@/lib/utils/caseAccess";
import { rateLimit, LIMITS } from "@/lib/utils/rateLimit";

// Kształt wiersza w zakresie, w jakim czyta go ta odpowiedź. Spisany wprost,
// żeby zmiana nazwy kolumny w migracji zapaliła się na kontroli typów, a nie
// dopiero jako `undefined` na stronie zlecenia.
interface CaseRow {
  case_id: string;
  status: string;
  file_name: string;
  total_cells: number | null;
  mesh_count: number | null;
  mpi_procs: number | null;
  t_end: number | null;
  complexity: string | null;
  vcpu_hours: number | null;
  wall_hours: number | null;
  price: number | null;
  server_type: string | null;
  dispatched_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  fds_log: string | null;
  fds_exit_code: number | null;
  devc_csv: string | null;
  hrr_csv: string | null;
  slice_json: unknown;
  devc_setpoints: unknown;
  last_progress_at: string | null;
  stop_requested: boolean | null;
  payment_status: string | null;
  file_path: string | null;
  server_id: number | null;
}

export async function GET(req: NextRequest, props: { params: Promise<{ caseId: string }> }) {
  const params = await props.params;
  const { caseId } = params;
  const limited = rateLimit(req, { scope: "case-read", ...LIMITS.caseRead });
  if (limited) return limited;
  try {
    return await handleGet(caseId);
  } catch (err) {
    // Ostatnia linia obrony — żaden nieprzewidziany wyjątek nie może zwrócić
    // gołego 500 (który front pokazuje jako „Błąd połączenia"). Loguj i oddaj JSON.
    console.error(`GET /api/symulacje/${caseId} unhandled:`, err);
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
  }
}

async function handleGet(caseId: string) {
  // Wiersz wydaje wyłącznie bramka własności — ten endpoint oddaje e-mail
  // i nazwisko klienta, cenę, cały log FDS oraz podpisane odnośniki do wyników.
  const access = await requireCaseAccess<CaseRow>(caseId);
  if (!access.ok) return access.response;
  const data = access.submission;

  // Signed URLs dla plików wynikowych z Hetzner Object Storage.
  // Także dla "failed": maszyna licząca wrzuca migawki co ~2 min i robi finalny
  // upload PRZED ustaleniem statusu (patrz lib/hetzner/cloud-init.ts), więc po
  // błędzie w połowie obliczeń policzone pliki są w magazynie. Bez tego użytkownik
  // widział wyłącznie komunikat o błędzie, mimo że wyniki czekały gotowe.
  // Awaria storage NIE może blokować całej strony — degraduj do braku listy plików.
  let results: Array<{ name: string; url: string }> | null = null;
  if (data.status === "done" || data.status === "failed") {
    try {
      // Pomijamy pliki służbowe (manifest migawki) — to nie są wyniki użytkownika.
      const files = (await listResults(caseId))
        .filter((f) => f.Key && !isInternalResult(f.Key.split("/").pop() ?? ""));
      if (files.length > 0) {
        results = await Promise.all(
          files.map(async (f) => ({
            name: f.Key!.split("/").pop()!,
            url: await signedResultUrl(f.Key!),
            size: f.Size ?? null,
            createdAt: f.LastModified?.toISOString() ?? null,
          }))
        );
      }
    } catch (err) {
      console.error(`GET /api/symulacje/${caseId}: listResults/signedUrl error (zwracam bez plików):`, err);
    }
  }

  return NextResponse.json({
    caseId: data.case_id,
    status: data.status,
    fileName: data.file_name,
    totalCells: data.total_cells,
    meshCount: data.mesh_count ?? null,
    mpiProcs: data.mpi_procs ?? null,
    tEnd: data.t_end,
    complexity: data.complexity,
    vcpuHours: data.vcpu_hours,
    wallHours: data.wall_hours,
    price: data.price,
    serverType: data.server_type,
    dispatchedAt: data.dispatched_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    fdsLog: data.fds_log ?? null,
    fdsExitCode: data.fds_exit_code ?? null,
    devcCsv: data.devc_csv ?? null,
    hrrCsv: data.hrr_csv ?? null,
    sliceJson: data.slice_json ?? null,
    devcSetpoints: data.devc_setpoints ?? null,
    // Ostatni zaobserwowany postęp — po tym strona poznaje, że zlecenie
    // zwolnił nadzorca, bo obliczenia stanęły w miejscu.
    lastProgressAt: data.last_progress_at ?? null,
    stopRequested: data.stop_requested === true,
    results,
    paymentStatus: data.payment_status ?? null,
  });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ caseId: string }> }) {
  const params = await props.params;
  const { caseId } = params;

  const access = await requireCaseAccess<Pick<CaseRow, "case_id" | "file_path" | "status" | "server_id">>(
    caseId,
    "case_id, file_path, status, server_id"
  );
  if (!access.ok) return access.response;
  const submission = access.submission;

  const admin = createAdminClient();

  // Jeśli symulacja jest aktywna — najpierw zatrzymaj serwer Hetzner
  if (["dispatched", "running"].includes(submission.status) && submission.server_id) {
    await deleteServer(submission.server_id).catch((err) => {
      console.error(`DELETE sim: deleteServer(${submission.server_id}) error:`, err);
    });
  }

  // Usuń plik wejściowy z Supabase Storage
  if (submission.file_path) {
    await admin.storage.from("fds-files").remove([submission.file_path]);
  }

  // Usuń wyniki z Hetzner Object Storage (jeśli są)
  try {
    await deleteResults(caseId);
  } catch {
    // Brak wyników — ignoruj
  }

  // Usuń rekord z bazy
  await admin.from("fds_submissions").delete().eq("case_id", caseId);

  return NextResponse.json({ ok: true });
}
