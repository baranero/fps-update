export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import { listServersDetailed, getServerTypePriceMap, hetznerRunCostEur } from "@/lib/hetzner/client";
import { bucketUsage } from "@/lib/hetzner/storage";

// Szacunkowa stawka Object Storage (EUR za rozpoczęty 1 TB / mies). Konfigurowalna,
// bo Hetzner rozlicza abonamentowo — traktujemy jako orientacyjny koszt.
const STORAGE_PRICE_PER_TB_EUR = parseFloat(process.env.HETZNER_STORAGE_PRICE_PER_TB_EUR ?? "5.99");
const TB = 1_000 ** 4;

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const errors: string[] = [];
  const admin = createAdminClient();

  // Serwery (live) + storage + cennik + historia zleceń — równolegle, odpornie.
  const [serversRes, storageRes, priceRes, subsRes] = await Promise.allSettled([
    listServersDetailed(),
    bucketUsage(),
    getServerTypePriceMap(),
    admin
      .from("fds_submissions")
      .select("server_type, dispatched_at, started_at, completed_at")
      .not("dispatched_at", "is", null),
  ]);

  // ── Serwery ──
  let servers: Array<{
    id: number; name: string; status: string; serverType: string;
    cores: number; memoryGb: number; diskGb: number; location: string;
    ipv4: string; created: string; uptimeHours: number;
    priceHourlyNet: number; priceMonthlyNet: number; accruedNet: number;
  }> = [];

  if (serversRes.status === "fulfilled") {
    servers = serversRes.value.map((s) => {
      const uptimeHours = Math.max(0, (now - new Date(s.created).getTime()) / 3_600_000);
      // Naliczenie ograniczone miesięcznym capem Hetznera (rozliczenie godzinowe do wysokości ceny mies.).
      const accruedNet = s.priceMonthlyNet > 0
        ? Math.min(uptimeHours * s.priceHourlyNet, s.priceMonthlyNet)
        : uptimeHours * s.priceHourlyNet;
      return { ...s, uptimeHours, accruedNet };
    });
  } else {
    errors.push(`servers: ${String(serversRes.reason?.message ?? serversRes.reason)}`);
  }

  const running = servers.filter((s) => s.status === "running");
  const serverTotals = {
    count: servers.length,
    running: running.length,
    hourlyNet: running.reduce((sum, s) => sum + s.priceHourlyNet, 0),
    monthlyNet: running.reduce((sum, s) => sum + s.priceMonthlyNet, 0),
    accruedNet: servers.reduce((sum, s) => sum + s.accruedNet, 0),
  };

  // ── Object Storage ──
  let storage: {
    bucket: string; objectCount: number; totalBytes: number;
    prefixes: Array<{ prefix: string; objectCount: number; totalBytes: number }>;
    truncated: boolean; monthlyCostEstimateEur: number;
  } | null = null;

  if (storageRes.status === "fulfilled") {
    const u = storageRes.value;
    const startedTb = Math.max(1, Math.ceil(u.totalBytes / TB));
    storage = {
      ...u,
      monthlyCostEstimateEur: startedTb * STORAGE_PRICE_PER_TB_EUR,
    };
  } else {
    errors.push(`storage: ${String(storageRes.reason?.message ?? storageRes.reason)}`);
  }

  // ── Koszt serwerów (compute) per miesiąc ──
  // Serwery są efemeryczne (kasowane po zleceniu), więc historyczny koszt odtwarzamy
  // z fds_submissions: dla każdej symulacji czas życia serwera × stawka jego typu,
  // grupowane po miesiącu uruchomienia (dispatched_at). Ceny bieżące — koszt szacunkowy.
  let monthlyCompute: Array<{ month: string; totalEur: number; count: number; runtimeHours: number }> = [];

  if (priceRes.status === "rejected") {
    errors.push(`pricing: ${String(priceRes.reason?.message ?? priceRes.reason)}`);
  } else if (subsRes.status === "fulfilled" && subsRes.value.error) {
    errors.push(`submissions: ${subsRes.value.error.message}`);
  } else if (subsRes.status === "fulfilled") {
    const priceMap = priceRes.value;
    const byMonth = new Map<string, { totalEur: number; count: number; runtimeHours: number }>();
    for (const r of subsRes.value.data ?? []) {
      const cost = hetznerRunCostEur(
        {
          serverType: r.server_type ?? null,
          dispatchedAt: r.dispatched_at ?? null,
          startedAt: r.started_at ?? null,
          completedAt: r.completed_at ?? null,
        },
        priceMap,
        now
      );
      if (cost.costEur == null) continue;
      const startIso = (r.dispatched_at ?? r.started_at) as string;
      const month = startIso.slice(0, 7); // YYYY-MM
      const agg = byMonth.get(month) ?? { totalEur: 0, count: 0, runtimeHours: 0 };
      agg.totalEur += cost.costEur;
      agg.count += 1;
      agg.runtimeHours += cost.runtimeHours ?? 0;
      byMonth.set(month, agg);
    }
    monthlyCompute = Array.from(byMonth.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  return NextResponse.json({
    servers,
    serverTotals,
    storage,
    monthlyCompute,
    pricePerTbEur: STORAGE_PRICE_PER_TB_EUR,
    generatedAt: new Date().toISOString(),
    errors,
  });
}
