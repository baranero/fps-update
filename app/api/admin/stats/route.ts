export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: sims } = await admin
    .from("fds_submissions")
    .select("status, price, payment_status");

  const counts = { total: 0, pending: 0, running: 0, done: 0, failed: 0, revenue: 0, unpaid: 0 };
  for (const s of sims ?? []) {
    counts.total++;
    if (s.status === "pending") counts.pending++;
    else if (s.status === "running") counts.running++;
    else if (s.status === "done") {
      counts.done++;
      counts.revenue += s.price ?? 0;
      if (s.payment_status !== "paid") counts.unpaid += s.price ?? 0;
    }
    else if (s.status === "failed") counts.failed++;
  }

  const { data: recent } = await admin
    .from("fds_submissions")
    .select("case_id, email, name, file_name, status, created_at, price, server_type, wall_hours")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const userCount = usersData?.users?.length ?? 0;

  // Konta czekające na zgodę na uruchamianie. Prośba bez odpowiedzi to klient,
  // który chce zapłacić i nie może — dlatego liczy się na pulpicie razem
  // z zawieszonymi zleceniami, a nie dopiero po wejściu w zakładkę.
  // `head: true` — potrzebna jest sama liczba, nie wiersze.
  const pendingAccess = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("sim_access", "requested");

  return NextResponse.json({
    counts: {
      ...counts,
      users: userCount,
      // Brak kolumny (nieuruchomiona migration_sim_access.sql) → 0, nie błąd.
      accessRequests: pendingAccess.error ? 0 : pendingAccess.count ?? 0,
    },
    recent: recent ?? [],
  });
}
