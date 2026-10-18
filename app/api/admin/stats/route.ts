export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import { OUR_FAULT, type FailureReason } from "@/lib/observability";

const DAY = 24 * 3600 * 1000;

type Row = {
  case_id: string;
  email: string | null;
  name: string | null;
  file_name: string | null;
  status: string;
  price: number | null;
  payment_status: string | null;
  created_at: string;
  completed_at: string | null;
  dispatched_at?: string | null;
  started_at?: string | null;
  t_end?: number | null;
  last_sim_time?: number | null;
  last_progress_at?: string | null;
  server_type?: string | null;
  wall_hours?: number | null;
  failure_reason?: string | null;
};

// Kolumny z późniejszych migracji — przy ich braku schodzimy do podstawowych,
// zamiast wywracać cały pulpit (tak samo jak reszta panelu).
const FULL = "case_id, email, name, file_name, status, price, payment_status, created_at, completed_at, dispatched_at, started_at, t_end, last_sim_time, last_progress_at, server_type, wall_hours, failure_reason";
const BASIC = "case_id, email, name, file_name, status, price, payment_status, created_at, completed_at, server_type, wall_hours";

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  let sims: Row[] = [];
  {
    const full = await admin.from("fds_submissions").select(FULL).limit(10000);
    if (!full.error) sims = (full.data ?? []) as unknown as Row[];
    else {
      const basic = await admin.from("fds_submissions").select(BASIC).limit(10000);
      sims = (basic.data ?? []) as unknown as Row[];
    }
  }

  const now = Date.now();
  const counts = { total: 0, pending: 0, running: 0, done: 0, failed: 0, revenue: 0, unpaid: 0 };
  let oldestUnpaidAt: string | null = null;
  for (const s of sims) {
    counts.total++;
    if (s.status === "pending") counts.pending++;
    // „dispatched” = maszyna wstaje; to już praca na nasz koszt, więc liczy się do „w toku”.
    else if (s.status === "running" || s.status === "dispatched") counts.running++;
    else if (s.status === "done") {
      counts.done++;
      counts.revenue += s.price ?? 0;
      if (s.payment_status !== "paid" && (s.price ?? 0) > 0) {
        counts.unpaid += s.price ?? 0;
        const at = s.completed_at ?? s.created_at;
        if (!oldestUnpaidAt || at < oldestUnpaidAt) oldestUnpaidAt = at;
      }
    } else if (s.status === "failed" || s.status === "error") counts.failed++;
  }

  // ── Ostatnie 30 dni: jakość usługi i przychód ──────────────────────────────
  const since = now - 30 * DAY;
  const last30 = { done: 0, failed: 0, failedOurs: 0, failedClient: 0, revenue: 0, byReason: {} as Record<string, number> };
  for (const s of sims) {
    const at = new Date(s.completed_at ?? s.created_at).getTime();
    if (at < since) continue;
    if (s.status === "done") {
      last30.done++;
      last30.revenue += s.price ?? 0;
    } else if (s.status === "failed" || s.status === "error") {
      last30.failed++;
      const reason = (s.failure_reason ?? "unknown") as FailureReason;
      last30.byReason[reason] = (last30.byReason[reason] ?? 0) + 1;
      if (reason === "cancelled_by_user") continue;
      if (OUR_FAULT[reason] ?? true) last30.failedOurs++;
      else last30.failedClient++;
    }
  }

  // ── Teraz na maszynach ─────────────────────────────────────────────────────
  const live = sims
    .filter((s) => s.status === "pending" || s.status === "dispatched" || s.status === "running")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => ({
      case_id: s.case_id,
      email: s.email,
      file_name: s.file_name,
      status: s.status,
      created_at: s.created_at,
      dispatched_at: s.dispatched_at ?? null,
      started_at: s.started_at ?? null,
      t_end: s.t_end ?? null,
      last_sim_time: s.last_sim_time ?? null,
      last_progress_at: s.last_progress_at ?? null,
      server_type: s.server_type ?? null,
      wall_hours: s.wall_hours ?? null,
    }));

  const recent = [...sims]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)
    .map(({ case_id, email, name, file_name, status, created_at, price, server_type, wall_hours }) => ({
      case_id, email, name, file_name, status, created_at, price, server_type, wall_hours,
    }));

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const userCount = usersData?.users?.length ?? 0;

  // Konta czekające na zgodę na uruchamianie. Prośba bez odpowiedzi to klient,
  // który chce zapłacić i nie może — dlatego liczy się na pulpicie razem
  // z zawieszonymi zleceniami, a nie dopiero po wejściu w zakładkę.
  const pendingAccess = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("sim_access", "requested");

  // Zdrowie automatyki: kiedy ostatnio przeszedł cron (nadzorca, zwalnianie
  // maszyn, retencja) i jakie były ostatnie błędy w dzienniku.
  const cron = await admin
    .from("job_events").select("at").eq("stage", "cleanup")
    .order("at", { ascending: false }).limit(1);
  const errors = await admin
    .from("job_events").select("at, case_id, stage, message").eq("level", "error")
    .order("at", { ascending: false }).limit(6);

  return NextResponse.json({
    counts: {
      ...counts,
      users: userCount,
      // Brak kolumny (nieuruchomiona migration_sim_access.sql) → 0, nie błąd.
      accessRequests: pendingAccess.error ? 0 : pendingAccess.count ?? 0,
    },
    oldestUnpaidAt,
    last30,
    live,
    recent,
    // null = dziennik niedostępny (brak migracji); "" = cron nigdy nie przeszedł.
    cronLastAt: cron.error ? null : cron.data?.[0]?.at ?? "",
    recentErrors: errors.error ? [] : errors.data ?? [],
  });
}
