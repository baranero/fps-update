import Stripe from "stripe";

// Klient Stripe powstaje leniwie i NIE przy starcie modułu — inaczej każdy
// import wywracałby się na środowisku bez kluczy (a tak było: `!` na
// `STRIPE_SECRET_KEY` zamieniał brak konfiguracji w błąd 500 bez treści).

let _stripe: Stripe | null = null;

/** Czy płatności są w ogóle skonfigurowane na tym wdrożeniu. */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Czy webhook ma czym weryfikować podpis — bez tego nie wolno ufać zdarzeniom. */
export function isStripeWebhookConfigured(): boolean {
  return !!process.env.STRIPE_WEBHOOK_SECRET;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    // Świadomy, czytelny wyjątek zamiast `undefined` wędrującego w głąb SDK.
    throw new Error(
      "Brak STRIPE_SECRET_KEY — płatności nie są skonfigurowane na tym wdrożeniu " +
        "(patrz docs/platnosci-stripe.md)."
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return _stripe;
}
