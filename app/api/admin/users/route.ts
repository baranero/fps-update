export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";
import { fromRow, isInvoiceComplete } from "@/lib/invoice";
import { isSimAccess, toSimAccess, type SimAccess } from "@/lib/access";
import { writeSimAccess } from "@/lib/utils/simAccess";
import { logEvent } from "@/lib/observability";
import { MAIL_FROM } from "@/lib/mail";

// Komplet kolumn rozliczeniowych po migration_invoice_data.sql. Gdy migracja
// nie jest jeszcze uruchomiona, PostgREST odrzuci zapytanie z powodu nieznanej
// kolumny — wtedy schodzimy na zestaw sprzed rozbicia adresu, żeby panel admina
// działał dalej (tyle że bez podziału na ulicę/miasto/kraj).
const PROFILE_COLUMNS =
  "id, buyer_type, full_name, company, nip, phone, street, postal_code, city, country, address, updated_at, " +
  "sim_access, sim_access_requested_at, sim_access_decided_at, sim_access_note";
// Kolejne zestawy zapasowe — schodzimy o jeden szczebel za każdą nieuruchomioną
// migracją, żeby panel działał dalej, tyle że bez najnowszych pól.
const PROFILE_COLUMNS_NO_ACCESS =
  "id, buyer_type, full_name, company, nip, phone, street, postal_code, city, country, address, updated_at";
const PROFILE_COLUMNS_LEGACY = "id, full_name, company, nip, phone, address, updated_at";

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [usersRes, simsRes, profilesFull] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("fds_submissions").select("email, status, price"),
    admin.from("profiles").select(PROFILE_COLUMNS),
  ]);

  // Wiersze profilu czytamy jako luźny rekord: każdy szczebel zapasowy ma inny
  // zestaw kolumn, a i tak sięgamy po nie przez `fromRow` i asercje niżej.
  type ProfileRow = Record<string, unknown> & { id: string };
  let profileRows = (profilesFull.data ?? null) as ProfileRow[] | null;
  for (const columns of [PROFILE_COLUMNS_NO_ACCESS, PROFILE_COLUMNS_LEGACY]) {
    if (profileRows) break;
    const retry = await admin.from("profiles").select(columns);
    profileRows = (retry.data ?? null) as ProfileRow[] | null;
  }

  const simsByEmail: Record<string, { total: number; done: number; revenue: number }> = {};
  for (const s of simsRes.data ?? []) {
    if (!simsByEmail[s.email]) simsByEmail[s.email] = { total: 0, done: 0, revenue: 0 };
    simsByEmail[s.email].total++;
    if (s.status === "done") {
      simsByEmail[s.email].done++;
      simsByEmail[s.email].revenue += s.price ?? 0;
    }
  }

  // Dane rozliczeniowe (dane do faktury) — jedno źródło prawdy: tabela profiles.
  const profileById = new Map<string, ProfileRow>();
  for (const p of profileRows ?? []) profileById.set(p.id, p);

  const users = (usersRes.data?.users ?? []).map((u) => {
    const p = profileById.get(u.id);
    // Dane nabywcy przechodzą przez ten sam model, co formularz klienta, więc
    // „gotowe do faktury" znaczy w panelu dokładnie to samo, co u użytkownika.
    const invoice = fromRow(p as never);
    return {
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      invoice,
      invoiceReady: isInvoiceComplete(invoice),
      // Bramka uruchamiania — właściciel widzi ją w tej samej tabeli, w której
      // ocenia konto, i tu też o niej decyduje (PATCH niżej).
      simAccess: toSimAccess((p as { sim_access?: unknown })?.sim_access),
      simAccessRequestedAt: (p as { sim_access_requested_at?: string | null })?.sim_access_requested_at ?? null,
      simAccessNote: (p as { sim_access_note?: string | null })?.sim_access_note ?? null,
      profile_updated_at: (p as { updated_at?: string | null })?.updated_at ?? null,
      ...simsByEmail[u.email ?? ""] ?? { total: 0, done: 0, revenue: 0 },
    };
  });

  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json(users);
}

/**
 * Decyzja właściciela o dostępie do uruchamiania obliczeń.
 *
 * Świadomie tutaj, a nie w osobnej trasie: to jedna komórka w tej samej tabeli
 * użytkowników, którą panel już pobiera, i jedyne miejsce, gdzie właściciel tę
 * decyzję podejmuje.
 */
export async function PATCH(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: unknown; simAccess?: unknown };
  const userId = typeof body.userId === "string" ? body.userId : null;
  if (!userId) return NextResponse.json({ error: "Brak userId." }, { status: 400 });
  if (!isSimAccess(body.simAccess)) {
    return NextResponse.json({ error: "Nieznany stan dostępu." }, { status: 400 });
  }
  const next: SimAccess = body.simAccess;

  const written = await writeSimAccess(userId, { access: next, decided: true });
  if (!written) {
    return NextResponse.json(
      { error: "Uruchom supabase/migration_sim_access.sql — kolumna sim_access nie istnieje." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(userId);
  const targetEmail = target?.user?.email ?? null;

  await logEvent({
    caseId: null,
    stage: "access",
    message: `Dostęp do uruchamiania: ${next}`,
    meta: { userId, email: targetEmail, decidedBy: user.email ?? null },
  });

  // Klient dowiaduje się o przyznaniu dostępu mailem — bez tego musiałby sam
  // wracać na stronę i sprawdzać, czy już wolno. Odmowy nie komunikujemy
  // automatem: to rozmowa, a nie powiadomienie.
  if (next === "granted" && targetEmail && process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com";
    await new Resend(process.env.RESEND_API_KEY).emails
      .send({
        from: MAIL_FROM,
        to: targetEmail,
        subject: "FDSRun — masz dostęp do uruchamiania obliczeń",
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <p style="font-size:15px;margin:0 0 16px">Dostęp przyznany — możesz uruchamiać obliczenia na swoim koncie.</p>
  <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
    Wgraj plik .fds w kreatorze, wybierz wariant obliczeń i uruchom. Płatność następuje
    po zakończeniu, według realnego zużycia — nic nie pobieramy z góry.
  </p>
  <a href="${appUrl}/symulacje/nowa" style="display:inline-block;background:#DC3545;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px">Uruchom pierwsze obliczenia</a>
</div>`,
      })
      .catch((err) => console.error("admin/users: mail o przyznaniu dostępu nieudany:", err));
  }

  return NextResponse.json({ ok: true, userId, simAccess: next });
}
