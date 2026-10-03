export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeWebhookConfigured } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/observability";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  // Brak sekretu = nie da się zweryfikować podpisu. Przyjęcie takiego zdarzenia
  // oznaczałoby, że każdy może oznaczyć cudze zlecenie jako opłacone.
  if (!isStripeWebhookConfigured()) {
    console.error("webhook Stripe: brak STRIPE_WEBHOOK_SECRET — zdarzenie odrzucone");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const caseId  = session.metadata?.case_id;

    if (caseId && session.payment_status === "paid") {
      const admin = createAdminClient();
      await admin
        .from("fds_submissions")
        .update({ payment_status: "paid" })
        .eq("stripe_session_id", session.id);

      await logEvent({
        caseId,
        stage: "payment",
        message: "Płatność potwierdzona przez Stripe",
        meta: {
          sessionId: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
          // Netto i stawka doklejone przy tworzeniu sesji — księgowość nie musi
          // ich odtwarzać z kwoty brutto (patrz app/api/platnosci/checkout).
          net: session.metadata?.net_pln ?? null,
          vatTreatment: session.metadata?.vat_treatment ?? null,
        },
      });

      // TODO(faktura): tutaj wpina się wystawienie faktury w ING Księgowość —
      // patrz docs/fakturowanie-ing.md. Świadomie NIE w checkoucie: fakturę
      // wystawiamy dopiero po potwierdzonej zapłacie.
    }
  }

  return NextResponse.json({ received: true });
}
