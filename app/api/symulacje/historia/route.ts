export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { serverLabel } from "@/lib/hetzner/catalog";

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fds_submissions")
    .select("case_id, file_name, status, created_at, price, wall_hours, server_type, mesh_count, total_cells")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Historia fetch error:", error);
    return NextResponse.json([], { status: 200 });
  }

  // Zamiast symbolu maszyny oddajemy jej opis („16 vCPU · 32 GB RAM").
  return NextResponse.json(
    (data ?? []).map(({ server_type, ...row }) => ({
      ...row,
      server_label: server_type ? serverLabel(server_type).label : null,
    }))
  );
}
