export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export async function GET(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nieautoryzowany." }, { status: 401 });

  const caseId = req.nextUrl.searchParams.get("caseId");
  if (!caseId) return NextResponse.json({ error: "Brak caseId." }, { status: 400 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("fds_submissions")
    .select("payment_status, stripe_session_id, user_id, email")
    .eq("case_id", caseId)
    .single();

  if (!sub) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  const owns = sub.user_id === user.id || sub.email === user.email;
  if (!owns) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });

  // Jeśli webhook nie zdążył — sprawdź bezpośrednio u Stripe
  if (sub.payment_status !== "paid" && sub.stripe_session_id) {
    const session = await getStripe().checkout.sessions.retrieve(sub.stripe_session_id);
    if (session.payment_status === "paid") {
      await admin
        .from("fds_submissions")
        .update({ payment_status: "paid" })
        .eq("case_id", caseId);
      return NextResponse.json({ payment_status: "paid" });
    }
  }

  return NextResponse.json({ payment_status: sub.payment_status ?? null });
}
