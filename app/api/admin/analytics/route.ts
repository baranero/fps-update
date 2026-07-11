export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

// Zwraca surowe pola wszystkich zleceń potrzebne do wykresów analitycznych.
// Dane zagregowane po stronie klienta (statusy, przychód, serwery, miesiące).
export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fds_submissions")
    .select("case_id, email, status, created_at, completed_at, price, server_type, wall_hours, total_cells, payment_status")
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ data: [] });
  }

  return NextResponse.json({ data: data ?? [] });
}
