export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { serverLabel } from "@/lib/hetzner/catalog";

// Pola zlecenia widoczne dla właściciela konta. `last_sim_time` + `t_end` dają
// REALNY postęp obliczeń (ile sekund symulacji solver już policzył) — bez nich
// pulpit musiałby zgadywać postęp z upływu czasu i prognozy, a prognoza myli się
// na tyle mocno, że taki pasek wprowadzał w błąd.
const COLUMNS =
  "case_id, file_name, status, created_at, dispatched_at, completed_at, price, wall_hours, " +
  "server_type, total_cells, mesh_count, t_end, last_sim_time, last_progress_at, payment_status";

/** Zestaw sprzed migration_stall_watchdog.sql — bez śladu postępu. */
const COLUMNS_LEGACY =
  "case_id, file_name, status, created_at, completed_at, price, wall_hours, " +
  "server_type, total_cells, mesh_count, payment_status";

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  const admin = createAdminClient();
  const query = (columns: string) =>
    admin
      .from("fds_submissions")
      .select(columns)
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order("created_at", { ascending: false });

  let { data, error } = await query(COLUMNS);

  // Kolumny postępu przybywają z migracją — dopóki jej nie ma, oddajemy resztę.
  if (error && /column .* does not exist|could not find the .* column/i.test(error.message)) {
    ({ data, error } = await query(COLUMNS_LEGACY));
  }

  if (error) {
    console.error("Rozliczenia fetch error:", error);
    return NextResponse.json([], { status: 200 });
  }

  // Symbol maszyny zostaje na serwerze — klient dostaje jej opis.
  return NextResponse.json(
    ((data ?? []) as unknown as Array<Record<string, unknown>>).map(({ server_type, ...row }) => ({
      ...row,
      server_label: server_type ? serverLabel(server_type as string).label : null,
    }))
  );
}
