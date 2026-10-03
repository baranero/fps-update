import type { User } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import {
  ANONYMOUS_ACCESS, accessState, toSimAccess, type AccessState, type SimAccess,
} from "@/lib/access";

// Serwerowa strona bramki dostępu. Reguły („kto może") mieszkają w lib/access.ts
// — izomorficznie, żeby UI i API oceniały to samo. Tutaj zostaje wyłącznie
// odczyt i zapis stanu w bazie.

/** Kolumny stanu dostępu — dokładane do zapytań panelu admina. */
export const SIM_ACCESS_COLUMNS =
  "sim_access, sim_access_requested_at, sim_access_decided_at, sim_access_note";

// Kolumna przybywa razem z migration_sim_access.sql, a migracje bywają
// uruchamiane po wdrożeniu kodu. Brak kolumny NIE może wywrócić strony ani
// otworzyć bramki — schodzimy wtedy na „none", czyli stan sprzed zmiany:
// uruchamia wyłącznie admin.
let missingColumnWarned = false;

function handleMissingColumn(where: string, message: string): void {
  if (missingColumnWarned) return;
  missingColumnWarned = true;
  console.error(
    `${where}: brak kolumny sim_access w profiles (${message}). ` +
      "Uruchom supabase/migration_sim_access.sql — do tego czasu symulacje uruchamia wyłącznie admin."
  );
}

/** Stan dostępu pojedynczego konta. Nieznany/brak wiersza → „none". */
export async function readSimAccess(userId: string): Promise<SimAccess> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("sim_access")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    handleMissingColumn("readSimAccess", error.message);
    return "none";
  }
  return toSimAccess((data as { sim_access?: unknown } | null)?.sim_access);
}

/**
 * Komplet uprawnień zalogowanego użytkownika — jedno wejście dla API i stron.
 * Brak sesji → stan anonimowy (bez zapytania do bazy).
 */
export async function currentAccess(): Promise<{ user: User | null; state: AccessState }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { user: null, state: ANONYMOUS_ACCESS };

  const admin = isAdmin(user.email);
  // Admin i tak przechodzi — nie płacimy za odczyt, żeby to potwierdzić.
  const access = admin ? "granted" : await readSimAccess(user.id);

  return { user, state: accessState({ isAdmin: admin, access }) };
}

/** Zapis decyzji właściciela lub prośby klienta. `false` = migracja nieuruchomiona. */
export async function writeSimAccess(
  userId: string,
  patch: { access: SimAccess; note?: string | null; decided?: boolean; requested?: boolean }
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const row: Record<string, unknown> = { sim_access: patch.access };
  if (patch.note !== undefined) row.sim_access_note = patch.note;
  if (patch.requested) row.sim_access_requested_at = now;
  if (patch.decided) row.sim_access_decided_at = now;

  const { error } = await admin.from("profiles").update(row).eq("id", userId);
  if (error) {
    handleMissingColumn("writeSimAccess", error.message);
    return false;
  }
  return true;
}
