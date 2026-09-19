import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

// Jedna bramka własności zlecenia dla wszystkich endpointów /api/symulacje/[caseId]/*.
//
// Wcześniej regułę „czy to moje zlecenie" powielały u siebie DELETE, /stop i
// /cancel, a odczytowe GET-y (szczegół, /results, /download, /download-zip)
// nie sprawdzały jej wcale — szły prosto przez service_role, czyli z pominięciem
// RLS. Wystarczył numer zlecenia, żeby obcy zobaczył e-mail i nazwisko klienta,
// cenę, cały log FDS i podpisane odnośniki do wszystkich plików wynikowych.
// Numer nie jest tajemnicą: niesie go e-mail, pasek adresu i zrzut ekranu.
//
// Reguła mieszka teraz w jednym miejscu, więc nowy endpoint nie może o niej
// „zapomnieć" — żeby dostać wiersz, musi przejść przez tę funkcję.

/** Kolumny potrzebne do rozstrzygnięcia własności — zawsze dociągane. */
const OWNER_COLUMNS = "user_id, email";

export type CaseAccessResult<T> =
  | { ok: true; submission: T; isAdminUser: boolean }
  | { ok: false; response: NextResponse };

/**
 * Sprawdza sesję i własność zlecenia, po czym oddaje jego wiersz.
 *
 * @param caseId  numer zlecenia z adresu
 * @param columns kolumny do pobrania (bez user_id/email — te dokładamy sami)
 */
export async function requireCaseAccess<T = Record<string, unknown>>(
  caseId: string,
  columns = "*"
): Promise<CaseAccessResult<T & { user_id: string | null; email: string | null }>> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Nieautoryzowany." }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const select = columns === "*" ? "*" : `${columns}, ${OWNER_COLUMNS}`;

  const { data: submission, error } = await admin
    .from("fds_submissions")
    .select(select)
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) {
    console.error(`requireCaseAccess [${caseId}] db error:`, error.message);
    return {
      ok: false,
      response: NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 }),
    };
  }

  if (!submission) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 }),
    };
  }

  const row = submission as unknown as { user_id: string | null; email: string | null };
  const isAdminUser = isAdmin(user.email);
  const owns = row.user_id === user.id || row.email === user.email || isAdminUser;

  if (!owns) {
    // Świadomie 404, nie 403: 403 potwierdza, że taki numer zlecenia istnieje,
    // co przy zgadywaniu numerów jest samo w sobie informacją.
    return {
      ok: false,
      response: NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 }),
    };
  }

  return {
    ok: true,
    submission: submission as unknown as T & { user_id: string | null; email: string | null },
    isAdminUser,
  };
}
