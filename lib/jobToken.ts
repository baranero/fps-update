import { createHmac, timingSafeEqual } from "crypto";

// ─── Token zlecenia dla maszyny liczącej ─────────────────────────────────────
//
// Maszyna dostawała dotąd GLOBALNY sekret webhooka, klucz service_role Supabase,
// token API Hetznera i klucze magazynu — wszystko w user_data, czytelne dla
// każdego, kto wejdzie na maszynę albo do jej metadanych. Jedna przejęta
// maszyna oznaczała pełny dostęp do bazy, konta chmury i wszystkich wyników.
//
// Teraz maszyna zna wyłącznie token SWOJEGO zlecenia. Token jest pochodną
// sekretu i numeru zlecenia (HMAC), więc:
//   * serwer weryfikuje go bez kolumny w bazie i bez migracji,
//   * wyciek tokenu nie zdradza sekretu ani tokenów innych zleceń,
//   * token przestaje być do czegokolwiek przydatny, gdy zlecenie jest zamknięte
//     (endpointy sprawdzają status).
//
// Wszystko, co maszyna robi poza swoim zleceniem (kasowanie siebie, zapis do
// magazynu), przechodzi przez endpointy serwisu, które ten token sprawdzają.

export const JOB_TOKEN_HEADER = "x-job-token";

export function jobToken(caseId: string, secret = process.env.WEBHOOK_SECRET): string {
  if (!secret) throw new Error("Brak WEBHOOK_SECRET");
  if (!caseId) throw new Error("Brak numeru zlecenia");
  return createHmac("sha256", secret).update(`fdsrun-job:${caseId}`).digest("hex");
}

/** Porównanie w stałym czasie — odpowiedź nie zdradza, ile znaków się zgadza. */
export function verifyJobToken(
  caseId: string,
  presented: string | null | undefined,
  secret = process.env.WEBHOOK_SECRET
): boolean {
  if (!secret || !presented || !caseId) return false;
  const expected = Buffer.from(jobToken(caseId, secret), "utf8");
  const got = Buffer.from(presented, "utf8");
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}
