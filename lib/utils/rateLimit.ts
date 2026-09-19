import { NextRequest, NextResponse } from "next/server";

// Prosty licznik żądań w oknie przesuwnym, trzymany w pamięci instancji.
//
// ŚWIADOME OGRANICZENIE: na Vercelu działa wiele instancji funkcji naraz, więc
// licznik nie jest globalny — przy N instancjach realny limit to N×limit. To i
// tak zmienia rząd wielkości ataku (zgadywanie numeru zlecenia przestaje być
// darmowe), a nie wymaga Redisa ani dodatkowej usługi w rachunku. Gdy ruch
// urośnie na tyle, że to zacznie przeszkadzać, podmienia się samo wnętrze
// `hit()` na wspólny magazyn — sygnatura zostaje.
//
// Właściwą ochroną danych zlecenia jest bramka własności (lib/utils/caseAccess.ts).
// Limit to druga warstwa: tłumi zgadywanie i chroni magazyn obiektów przed
// zalewem kosztownych operacji LIST.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sprzątanie: przy każdym wywołaniu usuwamy garść wygasłych wpisów, żeby mapa
// nie rosła w nieskończoność na długo żyjącej instancji. Bez osobnego timera —
// ten i tak nie przeżyłby uśpienia funkcji.
const SWEEP_EVERY = 100;
let sinceSweep = 0;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Adres klienta zza proxy Vercela; `unknown` gdy nagłówków brak (dev, testy). */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitOptions = {
  /** Nazwa reguły — osobna pula dla każdego rodzaju endpointu. */
  scope: string;
  /** Ile żądań wolno w oknie. */
  limit: number;
  /** Długość okna w milisekundach. */
  windowMs: number;
  /**
   * Dodatkowy wyróżnik klienta ponad adres IP — zwykle id zalogowanego
   * użytkownika, żeby jeden nadawca zza wspólnego NAT-u nie blokował reszty.
   */
  identity?: string;
};

/**
 * Zwraca gotową odpowiedź 429, gdy limit przekroczony — albo `null`, gdy można
 * obsłużyć żądanie. Wołaj na samym początku route'a:
 *
 *     const limited = rateLimit(req, { scope: "case-read", limit: 60, windowMs: 60_000 });
 *     if (limited) return limited;
 */
export function rateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
  const now = Date.now();

  if (++sinceSweep >= SWEEP_EVERY) {
    sinceSweep = 0;
    sweep(now);
  }

  const key = `${opts.scope}:${opts.identity ?? clientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= opts.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Zbyt wiele żądań. Spróbuj ponownie za chwilę." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    }
  );
}

// Gotowe profile — trzymane razem, żeby progi dało się porównać jednym rzutem oka.
export const LIMITS = {
  /**
   * Odczyt stanu zlecenia. Strona zlecenia odpytuje co 3 s (20/min), więc 60/min
   * zostawia zapas na dwie–trzy otwarte karty, a wciąż tnie automat.
   */
  caseRead: { limit: 60, windowMs: 60_000 },
  /** Operacje na magazynie obiektów (LIST + podpisy) — kosztowne, rzadkie. */
  storage: { limit: 20, windowMs: 60_000 },
  /** Pakowanie ZIP — bardzo kosztowne, liczone w minutach czasu funkcji. */
  archive: { limit: 6, windowMs: 60_000 },
  /** Publiczny planer: bez sesji, więc twardziej. */
  publicPlan: { limit: 30, windowMs: 60_000 },
} as const;
