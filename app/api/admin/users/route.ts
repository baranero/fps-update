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

  const [usersRes, simsRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("fds_submissions").select("email, status, price"),
    admin.from("profiles").select("id, full_name, company, nip, phone, address, updated_at"),
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

  // Dane rozliczeniowe (dane do faktury) — jedno źródło prawdy: tabela profiles.
  type ProfileRow = NonNullable<typeof profilesRes.data>[number];
  const profileById = new Map<string, ProfileRow>();
  for (const p of profilesRes.data ?? []) profileById.set(p.id, p);

  const users = (usersRes.data?.users ?? []).map((u) => {
    const p = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      full_name: p?.full_name ?? "",
      company: p?.company ?? "",
      nip: p?.nip ?? "",
      phone: p?.phone ?? "",
      address: p?.address ?? "",
      profile_updated_at: p?.updated_at ?? null,
      ...simsByEmail[u.email ?? ""] ?? { total: 0, done: 0, revenue: 0 },
    };
  });

  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json(users);
}
