import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { LIMITS, clientIp, rateLimit } from "@/lib/utils/rateLimit";

// Limiter jest drugą warstwą ochrony (pierwszą jest bramka własności), więc
// testy pilnują przede wszystkim tego, żeby NIE blokował ruchu prawidłowego:
// strona zlecenia odpytuje co 3 s i musi się w limicie zmieścić z zapasem.

/** Minimalna atrapa żądania — limiter czyta wyłącznie nagłówki. */
function req(headers: Record<string, string> = {}): NextRequest {
  const lower = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null } } as NextRequest;
}

/** Każdy test dostaje własnego klienta — licznik jest wspólny dla modułu. */
let nr = 0;
const kolejnyKlient = () => `test-${Date.now()}-${nr++}`;

describe("clientIp", () => {
  it("bierze pierwszy adres z łańcucha proxy", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }))).toBe("203.0.113.7");
  });

  it("spada na x-real-ip, a w ostateczności na wartość zastępczą", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(req())).toBe("unknown");
  });
});

describe("rateLimit", () => {
  it("przepuszcza ruch do wyczerpania limitu", () => {
    const identity = kolejnyKlient();
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(req(), { scope: "t", limit: 5, windowMs: 60_000, identity })).toBeNull();
    }
  });

  it("odcina dopiero po przekroczeniu limitu", () => {
    const identity = kolejnyKlient();
    for (let i = 0; i < 3; i++) rateLimit(req(), { scope: "t", limit: 3, windowMs: 60_000, identity });
    const odpowiedz = rateLimit(req(), { scope: "t", limit: 3, windowMs: 60_000, identity });
    expect(odpowiedz?.status).toBe(429);
  });

  it("odpowiedź 429 mówi, kiedy spróbować ponownie, i nie trafia do cache", () => {
    const identity = kolejnyKlient();
    rateLimit(req(), { scope: "t", limit: 1, windowMs: 60_000, identity });
    const odpowiedz = rateLimit(req(), { scope: "t", limit: 1, windowMs: 60_000, identity })!;
    expect(Number(odpowiedz.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(odpowiedz.headers.get("Cache-Control")).toBe("no-store");
  });

  it("liczy osobno każdą regułę — zapchany ZIP nie blokuje odczytu stanu", () => {
    const identity = kolejnyKlient();
    for (let i = 0; i < 4; i++) rateLimit(req(), { scope: "zip", limit: 1, windowMs: 60_000, identity });
    expect(rateLimit(req(), { scope: "zip", limit: 1, windowMs: 60_000, identity })?.status).toBe(429);
    expect(rateLimit(req(), { scope: "odczyt", limit: 1, windowMs: 60_000, identity })).toBeNull();
  });

  it("liczy osobno każdego klienta", () => {
    const a = kolejnyKlient();
    const b = kolejnyKlient();
    rateLimit(req(), { scope: "t", limit: 1, windowMs: 60_000, identity: a });
    expect(rateLimit(req(), { scope: "t", limit: 1, windowMs: 60_000, identity: a })?.status).toBe(429);
    expect(rateLimit(req(), { scope: "t", limit: 1, windowMs: 60_000, identity: b })).toBeNull();
  });

  it("rozróżnia klientów po adresie, gdy nie ma sesji", () => {
    const scope = `ip-${nr++}`;
    const jeden = req({ "x-forwarded-for": "203.0.113.1" });
    const drugi = req({ "x-forwarded-for": "203.0.113.2" });
    rateLimit(jeden, { scope, limit: 1, windowMs: 60_000 });
    expect(rateLimit(jeden, { scope, limit: 1, windowMs: 60_000 })?.status).toBe(429);
    expect(rateLimit(drugi, { scope, limit: 1, windowMs: 60_000 })).toBeNull();
  });
});

describe("rateLimit — okno czasowe", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("otwiera się ponownie po upływie okna", () => {
    const identity = kolejnyKlient();
    const opts = { scope: "okno", limit: 2, windowMs: 60_000, identity };

    rateLimit(req(), opts);
    rateLimit(req(), opts);
    expect(rateLimit(req(), opts)?.status).toBe(429);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit(req(), opts)).toBeNull();
  });

  it("nie otwiera się przed czasem", () => {
    const identity = kolejnyKlient();
    const opts = { scope: "okno", limit: 1, windowMs: 60_000, identity };

    rateLimit(req(), opts);
    vi.advanceTimersByTime(59_000);
    expect(rateLimit(req(), opts)?.status).toBe(429);
  });
});

describe("progi produkcyjne", () => {
  it("mieszczą polling strony zlecenia (co 3 s) z zapasem na kilka kart", () => {
    const zapytanNaMinute = 60 / 3;
    expect(LIMITS.caseRead.limit).toBeGreaterThanOrEqual(zapytanNaMinute * 2);
  });

  it("są tym ostrzejsze, im droższa operacja", () => {
    expect(LIMITS.archive.limit).toBeLessThan(LIMITS.storage.limit);
    expect(LIMITS.storage.limit).toBeLessThan(LIMITS.caseRead.limit);
  });

  it("wszystkie liczą w oknie minutowym", () => {
    for (const profil of Object.values(LIMITS)) {
      expect(profil.windowMs).toBe(60_000);
      expect(profil.limit).toBeGreaterThan(0);
    }
  });
});
