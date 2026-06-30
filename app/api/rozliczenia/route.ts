export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fds_submissions")
    .select("case_id, file_name, status, created_at, completed_at, price, wall_hours, server_type, total_cells, mesh_count")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Rozliczenia fetch error:", error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? []);
}
