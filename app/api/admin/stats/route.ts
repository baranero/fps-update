export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: sims } = await admin
    .from("fds_submissions")
    .select("status, price");

  const counts = { total: 0, pending: 0, running: 0, done: 0, failed: 0, revenue: 0 };
  for (const s of sims ?? []) {
    counts.total++;
    if (s.status === "pending") counts.pending++;
    else if (s.status === "running") counts.running++;
    else if (s.status === "done") { counts.done++; counts.revenue += s.price ?? 0; }
    else if (s.status === "failed") counts.failed++;
  }

  const { data: recent } = await admin
    .from("fds_submissions")
    .select("case_id, email, name, file_name, status, created_at, price, server_type, wall_hours")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const userCount = usersData?.users?.length ?? 0;

  return NextResponse.json({ counts: { ...counts, users: userCount }, recent: recent ?? [] });
}
