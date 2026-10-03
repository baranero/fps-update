// ─── Odczyt i zapis danych do faktury po stronie przeglądarki ────────────────
//
// Wydzielone z formularza, bo z tych samych danych korzysta teraz także strona
// Rozliczeń (stawka VAT, kwota brutto, ostrzeżenie o niekompletnych danych).
// Dwie kopie zapytania rozjechałyby się przy pierwszej zmianie kolumn.
//
// Cała odporność na nieuruchomioną migrację siedzi tutaj: kolumny z
// migration_invoice_data.sql mogą jeszcze nie istnieć, a panel ma działać dalej.

import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_INVOICE, fromRow, toRow, type InvoiceData } from "@/lib/invoice";

const COLUMNS_FULL =
  "buyer_type, company, full_name, nip, street, postal_code, city, country, phone, address";
/** Zestaw sprzed rozbicia adresu — używany, gdy migracja jeszcze nie przeszła. */
const COLUMNS_LEGACY = "company, full_name, nip, phone, address";

/** Nazwa kolumny z komunikatu Postgresa/PostgREST — null, gdy błąd jest inny. */
export function missingColumnName(message: string | undefined): string | null {
  if (!message) return null;
  const pg = message.match(/column\s+(?:"?[\w.]*?"?\.)?"?([a-z_][a-z0-9_]*)"?\s+does not exist/i);
  if (pg) return pg[1];
  const rest = message.match(/could not find the '([a-z_][a-z0-9_]*)' column/i);
  return rest ? rest[1] : null;
}

export type LoadResult =
  | { ok: true; data: InvoiceData }
  | { ok: false; reason: "noSession" | "error" };

export async function loadInvoiceData(supabase: SupabaseClient): Promise<LoadResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "noSession" };

  const full = await supabase.from("profiles").select(COLUMNS_FULL).eq("id", user.id).maybeSingle();

  if (!full.error) return { ok: true, data: fromRow(full.data as never) };

  // PGRST116 = brak wiersza. Konto bez profilu to nie błąd — to pusty formularz.
  if (full.error.code === "PGRST116") return { ok: true, data: { ...EMPTY_INVOICE } };

  if (missingColumnName(full.error.message)) {
    const legacy = await supabase.from("profiles").select(COLUMNS_LEGACY).eq("id", user.id).maybeSingle();
    if (legacy.error && legacy.error.code !== "PGRST116") return { ok: false, reason: "error" };
    return { ok: true, data: fromRow(legacy.data as never) };
  }

  return { ok: false, reason: "error" };
}

/**
 * Zapis z wycinaniem kolumn, których baza jeszcze nie zna. Zlecenie nie może
 * przepaść przez zaległą migrację — zapisujemy to, co się da, a brakujące pole
 * trafi do bazy po jej uruchomieniu.
 */
export async function saveInvoiceData(
  supabase: SupabaseClient,
  data: InvoiceData
): Promise<{ error: { message: string } | null; skipped: string[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "noSession" }, skipped: [] };

  const payload: Record<string, unknown> = {
    id: user.id,
    ...toRow(data),
    updated_at: new Date().toISOString(),
  };

  const skipped: string[] = [];
  for (let attempt = 0; attempt <= 8; attempt++) {
    const { error } = await supabase.from("profiles").upsert(payload);
    if (!error) return { error: null, skipped };

    const column = missingColumnName(error.message);
    if (!column || !(column in payload)) return { error, skipped };

    console.error(`dane do faktury: baza nie zna kolumny "${column}" — pomijam ją (uruchom zaległe migracje).`);
    delete payload[column];
    skipped.push(column);
  }

  return { error: { message: "Zbyt wiele brakujących kolumn — uruchom migracje bazy." }, skipped };
}
