export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import { deleteServer, getServerTypePriceMap, hetznerRunCostEur } from "@/lib/hetzner/client";
import { deleteResults, listResults } from "@/lib/hetzner/storage";
import { EUR_PLN, STORAGE_EUR_PER_GB } from "@/lib/fds/parser";

// Rozliczenie pojedynczej symulacji: ile płaci klient vs. ile realnie kosztuje nas
// przebieg (serwer Hetzner wg cennika + Object Storage wg faktycznego rozmiaru
// wyników). Osobny GET, bo storage wymaga LIST po magazynie — za drogo, by liczyć
// to dla każdego wiersza listy.
export async function GET(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("fds_submissions")
    .select("case_id, price, server_type, dispatched_at, started_at, completed_at")
    .eq("case_id", params.caseId)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });
  }

  // Koszt serwera — realna stawka z cennika Hetzner × czas życia maszyny.
  let serverEur: number | null = null;
  let runtimeH: number | null = null;
  let hourlyNet: number | null = null;
  try {
    const priceMap = await getServerTypePriceMap();
    const c = hetznerRunCostEur(
      {
        serverType: row.server_type ?? null,
        dispatchedAt: row.dispatched_at ?? null,
        startedAt: row.started_at ?? null,
        completedAt: row.completed_at ?? null,
      },
      priceMap
    );
    serverEur = c.costEur;
    runtimeH = c.runtimeHours;
    hourlyNet = c.hourlyNet;
  } catch (err) {
    console.error(`Admin sim cost: getServerTypePriceMap [${params.caseId}]:`, err);
  }

  // Koszt magazynu — faktyczny rozmiar wyników × stawka (storage + egress).
  let storageGb: number | null = null;
  let storageEur: number | null = null;
  try {
    const objects = await listResults(params.caseId);
    storageGb = objects.reduce((sum, o) => sum + (o.Size ?? 0), 0) / 1024 ** 3;
    storageEur = storageGb * STORAGE_EUR_PER_GB;
  } catch (err) {
    console.error(`Admin sim cost: listResults [${params.caseId}]:`, err);
  }

  const costEur =
    serverEur == null && storageEur == null ? null : (serverEur ?? 0) + (storageEur ?? 0);
  const costPln = costEur == null ? null : costEur * EUR_PLN;
  const price = row.price ?? null;
  const marginPln = price == null || costPln == null ? null : price - costPln;
  // Narzut = ile razy cena przewyższa koszt; marża % = udział zysku w cenie.
  const markup = price == null || !costPln ? null : price / costPln;
  const marginPct = price == null || marginPln == null || price === 0 ? null : (marginPln / price) * 100;

  return NextResponse.json({
    caseId: row.case_id,
    price,
    eurPln: EUR_PLN,
    serverType: row.server_type ?? null,
    runtimeH,
    hourlyNet,
    serverEur,
    storageGb,
    storageEur,
    costEur,
    costPln,
    marginPln,
    markup,
    marginPct,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { status, price, server_type, wall_hours } = body as {
    status?: string;
    price?: number;
    server_type?: string;
    wall_hours?: number;
  };

  // Jeśli admin ustawia "cancelled" — zatrzymaj serwer Hetzner
  if (status === "cancelled") {
    const admin2 = createAdminClient();
    const { data: sub } = await admin2
      .from("fds_submissions")
      .select("server_id, status")
      .eq("case_id", params.caseId)
      .single();
    if (sub?.server_id && ["pending", "dispatched", "running"].includes(sub.status)) {
      await deleteServer(sub.server_id).catch((err) => {
        console.error(`Admin PATCH cancel: deleteServer(${sub.server_id}) error:`, err);
      });
    }
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (["done", "failed", "cancelled"].includes(status)) {
      updates.completed_at = new Date().toISOString();
    }
  }
  if (price !== undefined) updates.price = price;
  if (server_type !== undefined) updates.server_type = server_type;
  if (wall_hours !== undefined) updates.wall_hours = wall_hours;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("fds_submissions")
    .update(updates)
    .eq("case_id", params.caseId);

  if (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Trwałe usunięcie cudzego zlecenia przez admina: zatrzymuje serwer (jeśli aktywny),
// czyści plik wejściowy i wyniki z magazynów, a na końcu kasuje rekord z bazy.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: submission } = await admin
    .from("fds_submissions")
    .select("case_id, file_path, status, server_id")
    .eq("case_id", params.caseId)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });
  }

  // Aktywne zlecenie — najpierw ubij serwer, żeby nie naliczał kosztów
  if (["pending", "dispatched", "running"].includes(submission.status) && submission.server_id) {
    await deleteServer(submission.server_id).catch((err) => {
      console.error(`Admin DELETE: deleteServer(${submission.server_id}) error:`, err);
    });
  }

  // Plik wejściowy .fds z Supabase Storage
  if (submission.file_path) {
    await admin.storage.from("fds-files").remove([submission.file_path]);
  }

  // Wyniki z Hetzner Object Storage (jeśli są)
  try {
    await deleteResults(params.caseId);
  } catch {
    // Brak wyników — ignoruj
  }

  const { error } = await admin.from("fds_submissions").delete().eq("case_id", params.caseId);
  if (error) {
    console.error("Admin DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
