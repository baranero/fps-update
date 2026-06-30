export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { listResults, signedResultUrl } from "@/lib/hetzner/storage";

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
