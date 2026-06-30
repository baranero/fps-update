export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { listResults, signedResultUrl, deleteResults } from "@/lib/hetzner/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("fds_submissions")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });
  }

  // Jeśli done — wygeneruj signed URLs dla plików wynikowych z Hetzner Object Storage
  let results: Array<{ name: string; url: string }> | null = null;
  if (data.status === "done") {
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
    results,
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
    .select("case_id, file_path, status, user_id, email")
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

  // Nie pozwól usuwać aktywnych symulacji
  if (submission.status === "running" || submission.status === "dispatched") {
    return NextResponse.json({ error: "Nie można usunąć symulacji w trakcie obliczeń." }, { status: 409 });
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
