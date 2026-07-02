export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import { deleteServer } from "@/lib/hetzner/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { status, price, server_type, wall_hours } = body as {
    status?: string;
    price?: number;
    server_type?: string;
    wall_hours?: number;
  };

  // Jeśli admin ustawia "cancelled" — zatrzymaj serwer Hetzner
  if (status === "cancelled") {
    const admin2 = createAdminClient();
    const { data: sub } = await admin2
      .from("fds_submissions")
      .select("server_id, status")
      .eq("case_id", params.caseId)
      .single();
    if (sub?.server_id && ["pending", "dispatched", "running"].includes(sub.status)) {
      await deleteServer(sub.server_id).catch((err) => {
        console.error(`Admin PATCH cancel: deleteServer(${sub.server_id}) error:`, err);
      });
    }
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (["done", "failed", "cancelled"].includes(status)) {
      updates.completed_at = new Date().toISOString();
    }
  }
  if (price !== undefined) updates.price = price;
  if (server_type !== undefined) updates.server_type = server_type;
  if (wall_hours !== undefined) updates.wall_hours = wall_hours;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("fds_submissions")
    .update(updates)
    .eq("case_id", params.caseId);

  if (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
