export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
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

      console.log(`Payment confirmed for case ${caseId}`);
    }
  }

  return NextResponse.json({ received: true });
}
