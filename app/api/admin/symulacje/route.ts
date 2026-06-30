export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

export async function GET(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();

  let query = admin
    .from("fds_submissions")
    .select("case_id, email, name, file_name, status, created_at, completed_at, price, server_type, wall_hours, total_cells", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") query = query.eq("status", status);
  if (search) {
    query = query.or(`case_id.ilike.%${search}%,email.ilike.%${search}%,file_name.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("Admin sims error:", error);
    return NextResponse.json({ data: [], total: 0 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}
