export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteServer } from "@/lib/hetzner/client";
import { requireCaseAccess } from "@/lib/utils/caseAccess";

export async function POST(_req: NextRequest, props: { params: Promise<{ caseId: string }> }) {
  const params = await props.params;
  const { caseId } = params;

  const access = await requireCaseAccess<{ status: string; server_id: number | null }>(
    caseId,
    "case_id, status, server_id"
  );
  if (!access.ok) return access.response;
  const sub = access.submission;

  const admin = createAdminClient();

  if (!["pending", "dispatched", "running"].includes(sub.status)) {
    return NextResponse.json({ error: "Nie można anulować zakończonego zlecenia." }, { status: 409 });
  }

  // Zatrzymaj serwer Hetzner
  if (sub.server_id) {
    await deleteServer(sub.server_id).catch((err) => {
      console.error(`Cancel: deleteServer(${sub.server_id}) error:`, err);
    });
  }

  await admin
    .from("fds_submissions")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("case_id", caseId);

  return NextResponse.json({ ok: true });
}
