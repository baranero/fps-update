export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nieautoryzowany." }, { status: 401 });

  const { caseId } = await req.json().catch(() => ({})) as { caseId?: string };
  if (!caseId) return NextResponse.json({ error: "Brak caseId." }, { status: 400 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("fds_submissions")
    .select("case_id, file_name, status, price, payment_status, user_id, email")
    .eq("case_id", caseId)
    .single();

  if (!sub) return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });

  const owns = sub.user_id === user.id || sub.email === user.email;
  if (!owns) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });

  if (sub.status !== "done") {
    return NextResponse.json({ error: "Obliczenia nie zostały jeszcze zakończone." }, { status: 409 });
  }
  if (sub.payment_status === "paid") {
    return NextResponse.json({ error: "Zlecenie jest już opłacone." }, { status: 409 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "pln",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "pln",
          unit_amount: Math.round(sub.price * 100), // grosze
          product_data: {
            name: `Symulacja FDS — ${sub.file_name}`,
            description: `Zlecenie ${caseId}`,
          },
        },
      },
    ],
    metadata: { case_id: caseId },
    customer_email: user.email ?? undefined,
    success_url: `${origin}/narzedzia/symulacje/${caseId}?platnosc=sukces`,
    cancel_url:  `${origin}/narzedzia/symulacje/${caseId}?platnosc=anulowano`,
    payment_method_types: ["card", "blik", "p24"],
  });

  await admin
    .from("fds_submissions")
    .update({ payment_status: "pending", stripe_session_id: session.id })
    .eq("case_id", caseId);

  return NextResponse.json({ url: session.url });
}
