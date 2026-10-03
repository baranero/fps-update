export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { ACCESS_NOTE_MAX, ANONYMOUS_ACCESS, canRequestAccess } from "@/lib/access";
import { currentAccess, writeSimAccess } from "@/lib/utils/simAccess";
import { rateLimit, LIMITS } from "@/lib/utils/rateLimit";
import { logEvent } from "@/lib/observability";
import { MAIL_FROM } from "@/lib/mail";

// Bramka dostępu do uruchamiania obliczeń — od strony klienta.
//
// GET  — czym dysponuje TO konto (kreator, pulpit i belka pytają o to zamiast
//        porównywać e-mail z NEXT_PUBLIC_ADMIN_EMAIL w przeglądarce; adres
//        właściciela nie ma po co leżeć w bundlu).
// POST — prośba o dostęp. Wcześniej w tym miejscu był `mailto:` — lejek
//        wychodził poza produkt i nie zostawiał śladu, po którym właściciel
//        mógłby go obsłużyć.

export async function GET() {
  const { state } = await currentAccess();
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const { user, state } = await currentAccess();
  if (!user) {
    return NextResponse.json({ ...ANONYMOUS_ACCESS, error: "Wymagane logowanie." }, { status: 401 });
  }

  const limited = rateLimit(req, { scope: "access-request", identity: user.id, ...LIMITS.accessRequest });
  if (limited) return limited;

  // Admin nie prosi sam siebie, a odmowa jest ostateczna — obie sytuacje
  // kończą się tym samym: oddajemy aktualny stan, niczego nie zmieniając.
  if (!canRequestAccess(state.access) || state.isAdmin) {
    return NextResponse.json(state, { status: state.access === "requested" ? 200 : 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { note?: unknown };
  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, ACCESS_NOTE_MAX)
      : null;

  const written = await writeSimAccess(user.id, { access: "requested", note, requested: true });
  if (!written) {
    return NextResponse.json(
      { ...state, error: "Nie udało się zapisać prośby. Napisz do nas: biuro@fp-solutions.pl" },
      { status: 503 }
    );
  }

  await logEvent({
    caseId: null,
    stage: "access",
    message: "Prośba o dostęp do uruchamiania",
    meta: { userId: user.id, email: user.email ?? null, note },
  });

  // Powiadomienie właściciela. Wysyłka nie może przesądzać o wyniku: prośba
  // jest już w bazie i widać ją w panelu, nawet gdy Resend akurat nie odpowie.
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && process.env.RESEND_API_KEY) {
    const panelUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com"}/symulacje/admin?zakladka=uzytkownicy`;
    await new Resend(process.env.RESEND_API_KEY).emails
      .send({
        from: MAIL_FROM,
        to: adminEmail,
        subject: `FDSRun — prośba o dostęp: ${user.email ?? user.id}`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <p style="font-size:15px;margin:0 0 16px"><strong>${user.email ?? user.id}</strong> prosi o dostęp do uruchamiania symulacji.</p>
  ${note ? `<p style="font-size:14px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:0 0 16px">${note.replace(/</g, "&lt;")}</p>` : ""}
  <a href="${panelUrl}" style="display:inline-block;background:#DC3545;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px">Otwórz panel</a>
</div>`,
      })
      .catch((err) => console.error("dostep: powiadomienie do admina nieudane:", err));
  }

  return NextResponse.json({ ...state, access: "requested", canRequest: false });
}
