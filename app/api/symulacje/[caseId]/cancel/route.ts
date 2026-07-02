export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { deleteServer } from "@/lib/hetzner/client";
import { isAdmin } from "@/lib/utils/adminCheck";

export async function POST(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nieautoryzowany." }, { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("fds_submissions")
    .select("case_id, status, server_id, user_id, email")
    .eq("case_id", caseId)
    .single();

  if (!sub) return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });

  const owns = sub.user_id === user.id || sub.email === user.email || isAdmin(user.email);
  if (!owns) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });

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
