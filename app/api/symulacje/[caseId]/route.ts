export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { listResults, signedResultUrl, deleteResults } from "@/lib/hetzner/storage";
import { deleteServer } from "@/lib/hetzner/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;
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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("fds_submissions")
    .select("*, payment_status, stripe_session_id")
    .eq("case_id", caseId)
    .single();

  if (error) {
    // Brak wiersza => 404 (a nie ogólny "błąd połączenia"); realny błąd => 500
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });
    }
    console.error(`GET /api/symulacje/${caseId} db error:`, error);
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });
  }

  // Jeśli done — wygeneruj signed URLs dla plików wynikowych z Hetzner Object Storage.
  // Awaria storage NIE może blokować całej strony — degraduj do braku listy plików.
  let results: Array<{ name: string; url: string }> | null = null;
  if (data.status === "done") {
    try {
      const files = await listResults(caseId);
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
    stopRequested: data.stop_requested === true,
    results,
    paymentStatus: data.payment_status ?? null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;

  // Weryfikuj zalogowanego użytkownika
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nieautoryzowany." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Pobierz rekord i sprawdź własność (user_id lub email)
  const { data: submission } = await admin
    .from("fds_submissions")
    .select("case_id, file_path, status, server_id, user_id, email")
    .eq("case_id", caseId)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });
  }

  const owns =
    submission.user_id === user.id ||
    submission.email === user.email;

  if (!owns) {
    return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  }

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
