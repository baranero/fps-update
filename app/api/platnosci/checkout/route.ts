export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { fromRow, grossAmount, vatTreatment } from "@/lib/invoice";

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nieautoryzowany." }, { status: 401 });

  // Bez kluczy nie udajemy, że płatność jest możliwa — 503 i jasny komunikat,
  // zamiast błędu 500 z wnętrza SDK.
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Płatności online nie są jeszcze uruchomione. Skontaktuj się z nami — wystawimy fakturę." },
      { status: 503 }
    );
  }

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

  // Kwota do pobrania musi być BRUTTO — `price` w bazie jest kwotą netto.
  // Stawka zależy od tego, kim jest nabywca: podatnik z UE rozlicza VAT u siebie
  // (odwrotne obciążenie), nabywca spoza UE jest poza zakresem polskiego VAT.
  // Bez tego Stripe pobierałby netto, a faktura opiewała na brutto.
  const profileFull = await admin
    .from("profiles")
    .select("buyer_type, company, full_name, nip, street, postal_code, city, country, phone")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileFull.error
    ? (await admin.from("profiles").select("company, full_name, nip, phone, address").eq("id", user.id).maybeSingle()).data
    : profileFull.data;

  const invoice = fromRow(profile as never);
  const vat = vatTreatment(invoice);
  const net = Math.max(0, sub.price ?? 0);
  const gross = grossAmount(net, invoice);

  // Adres powrotny ze Stripe. Nagłówek `Origin` bywa nieobecny (żądanie spoza
  // przeglądarki, część proxy), a pusty `origin` dawał success_url w postaci
  // „/symulacje/FDS-…" — adres względny, którego Stripe nie przyjmuje. Kanoniczny
  // adres serwisu jest w NEXT_PUBLIC_APP_URL i to on jest właściwym zapasem.
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://fdsrun.com";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    currency: "pln",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "pln",
          unit_amount: Math.round(gross * 100), // grosze, brutto
          product_data: {
            name: `Symulacja FDS — ${sub.file_name}`,
            description:
              vat.treatment === "standard"
                ? `Zlecenie ${caseId} · ${net.toFixed(2)} zł netto + VAT ${Math.round(vat.rate * 100)}%`
                : vat.treatment === "reverseCharge"
                ? `Zlecenie ${caseId} · ${net.toFixed(2)} zł · odwrotne obciążenie`
                : `Zlecenie ${caseId} · ${net.toFixed(2)} zł · poza zakresem VAT`,
          },
        },
      },
    ],
    // Netto i stawka w metadanych — webhook i księgowość nie muszą ich
    // odtwarzać z kwoty brutto, a rozliczenie zgadza się co do grosza.
    metadata: {
      case_id: caseId,
      net_pln: net.toFixed(2),
      vat_rate: String(vat.rate),
      vat_treatment: vat.treatment,
    },
    customer_email: user.email ?? undefined,
    success_url: `${origin}/symulacje/${caseId}?platnosc=sukces`,
    cancel_url:  `${origin}/symulacje/${caseId}?platnosc=anulowano`,
    payment_method_types: ["card", "blik", "p24"],
  });

  await admin
    .from("fds_submissions")
    .update({ payment_status: "pending", stripe_session_id: session.id })
    .eq("case_id", caseId);

  return NextResponse.json({ url: session.url });
}
