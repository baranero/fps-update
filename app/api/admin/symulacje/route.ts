export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import { getServerTypePriceMap, hetznerRunCostEur, type ServerTypePrice } from "@/lib/hetzner/client";

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
    .select("case_id, email, name, file_name, status, created_at, completed_at, dispatched_at, started_at, price, server_type, wall_hours, total_cells", { count: "exact" })
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

  // Realny koszt Hetzner per symulacja (czas życia serwera × stawka typu).
  // Awaria cennika nie może wywalić listy — degradujemy do braku kosztu.
  let priceMap: Map<string, ServerTypePrice> | null = null;
  try {
    priceMap = await getServerTypePriceMap();
  } catch (err) {
    console.error("Admin sims: getServerTypePriceMap error:", err);
  }

  const now = Date.now();
  const enriched = (data ?? []).map((row) => {
    const cost = priceMap
      ? hetznerRunCostEur(
          {
            serverType: row.server_type ?? null,
            dispatchedAt: row.dispatched_at ?? null,
            startedAt: row.started_at ?? null,
            completedAt: row.completed_at ?? null,
          },
          priceMap,
          now
        )
      : { costEur: null, runtimeHours: null, hourlyNet: null };
    return {
      ...row,
      hetzner_cost_eur: cost.costEur,
      hetzner_runtime_h: cost.runtimeHours,
    };
  });

  return NextResponse.json({ data: enriched, total: count ?? 0, page, limit });
}
