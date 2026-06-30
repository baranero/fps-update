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

  const [usersRes, simsRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("fds_submissions").select("email, status, price"),
  ]);

  const simsByEmail: Record<string, { total: number; done: number; revenue: number }> = {};
  for (const s of simsRes.data ?? []) {
    if (!simsByEmail[s.email]) simsByEmail[s.email] = { total: 0, done: 0, revenue: 0 };
    simsByEmail[s.email].total++;
    if (s.status === "done") {
      simsByEmail[s.email].done++;
      simsByEmail[s.email].revenue += s.price ?? 0;
    }
  }

  const users = (usersRes.data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    ...simsByEmail[u.email ?? ""] ?? { total: 0, done: 0, revenue: 0 },
  }));

  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json(users);
}
