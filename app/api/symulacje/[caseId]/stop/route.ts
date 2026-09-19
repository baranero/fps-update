export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireCaseAccess } from "@/lib/utils/caseAccess";

// Łagodne zatrzymanie: NIE usuwa serwera. Ustawia flagę stop_requested,
// którą maszyna licząca odczytuje (w odpowiedzi webhooka /complete) i tworzy
// plik CHID.stop — FDS kończy bieżący krok, zapisuje wyniki i wychodzi czysto.
// Zlecenie przechodzi normalnie w "done" z dostępnymi wynikami.
export async function POST(_req: NextRequest, props: { params: Promise<{ caseId: string }> }) {
  const params = await props.params;
  const { caseId } = params;

  const access = await requireCaseAccess<{ status: string }>(caseId, "case_id, status");
  if (!access.ok) return access.response;
  const sub = access.submission;

  const admin = createAdminClient();

  // Łagodny stop ma sens tylko gdy FDS liczy — inaczej brak wyników do zapisania.
  if (sub.status !== "running") {
    return NextResponse.json(
      { error: "Łagodne zatrzymanie jest możliwe tylko dla trwających obliczeń." },
      { status: 409 }
    );
  }

  await admin
    .from("fds_submissions")
    .update({ stop_requested: true })
    .eq("case_id", caseId);

  return NextResponse.json({ ok: true, mode: "graceful" });
}
