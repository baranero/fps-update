export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

// Łagodne zatrzymanie: NIE usuwa serwera. Ustawia flagę stop_requested,
// którą maszyna licząca odczytuje (w odpowiedzi webhooka /complete) i tworzy
// plik CHID.stop — FDS kończy bieżący krok, zapisuje wyniki i wychodzi czysto.
// Zlecenie przechodzi normalnie w "done" z dostępnymi wynikami.
export async function POST(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nieautoryzowany." }, { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("fds_submissions")
    .select("case_id, status, user_id, email")
    .eq("case_id", caseId)
    .single();

  if (!sub) return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });

  const owns = sub.user_id === user.id || sub.email === user.email || isAdmin(user.email);
  if (!owns) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });

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
