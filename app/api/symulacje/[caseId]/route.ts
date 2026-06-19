export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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

  // Jeśli done — wygeneruj signed URLs dla plików wynikowych
  let results: Array<{ name: string; url: string }> | null = null;
  if (data.status === "done") {
    const { data: files } = await supabase.storage
      .from("fds-files")
      .list(`results/${caseId}`, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (files && files.length > 0) {
      const urls = await Promise.all(
        files
          .filter((f) => f.name !== ".emptyFolderPlaceholder")
          .map(async (f) => {
            const { data: signed } = await supabase.storage
              .from("fds-files")
              .createSignedUrl(`results/${caseId}/${f.name}`, 86400); // 24h
            return {
              name: f.name,
              url: signed?.signedUrl ?? "",
              size: (f.metadata?.size as number | undefined) ?? null,
              createdAt: f.created_at ?? null,
            };
          })
      );
      results = urls.filter((u) => u.url);
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
