export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteServer } from "@/lib/hetzner/client";
import { Resend } from "resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-solutions.pl";

function emailDone(
  to: string,
  name: string,
  caseId: string,
  fileName: string,
  price: number,
  wallHours: number,
  serverType: string | null
): Parameters<Resend["emails"]["send"]>[0] {
  const url = `${APP_URL}/symulacje/${caseId}`;
  const wallStr = wallHours < 1
    ? `${Math.round(wallHours * 60)} min`
    : `${wallHours.toFixed(1)} h`;

  return {
    from: "FP Solutions <noreply@fp-solutions.pl>",
    to,
    subject: `Obliczenia FDS zakończone — ${caseId}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <div style="background:#DC3545;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#fff;font-weight:900;font-size:18px;margin:0">FP Solutions</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0">Symulacje numeryczne CFD / FDS</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <div style="display:inline-block;background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:8px 16px;margin-bottom:20px">
      <p style="color:#16a34a;font-weight:700;font-size:13px;margin:0">✓ Obliczenia zakończone pomyślnie</p>
    </div>
    <p style="font-size:15px;margin:0 0 16px">Cześć <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
      Obliczenia numeryczne FDS dla Twojego projektu zostały zakończone.
      Wyniki są dostępne do pobrania w panelu — pliki będą dostępne przez 60 dni.
    </p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#64748b;width:50%">Numer zlecenia</td><td style="font-weight:700;font-family:monospace;color:#DC3545">${caseId}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Plik wejściowy</td><td style="font-weight:600">${fileName}</td></tr>
        ${serverType ? `<tr><td style="padding:6px 0;color:#64748b">Serwer</td><td style="font-weight:600;text-transform:uppercase">${serverType}</td></tr>` : ""}
        ${wallHours > 0 ? `<tr><td style="padding:6px 0;color:#64748b">Czas obliczeń</td><td style="font-weight:600">${wallStr}</td></tr>` : ""}
        ${price > 0 ? `<tr><td style="padding:6px 0;color:#64748b">Cena netto</td><td style="font-weight:700;color:#DC3545;font-size:15px">${price.toLocaleString("pl-PL")} zł</td></tr>` : ""}
      </table>
    </div>
    <a href="${url}"
       style="display:inline-block;background:#DC3545;color:#fff;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;font-size:14px;margin-bottom:24px">
      Pobierz wyniki →
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:0 0 4px;word-break:break-all">${url}</p>
    <p style="font-size:12px;color:#94a3b8;margin:16px 0 0;border-top:1px solid #e2e8f0;padding-top:16px">
      Pytania: <a href="mailto:biuro@fp-solutions.pl" style="color:#DC3545">biuro@fp-solutions.pl</a>
      · <a href="tel:+48790782993" style="color:#DC3545">+48 790 782 993</a>
    </p>
  </div>
</div>`,
  };
}

function emailFailed(
  to: string,
  name: string,
  caseId: string,
  fileName: string
): Parameters<Resend["emails"]["send"]>[0] {
  const url = `${APP_URL}/symulacje/${caseId}`;

  return {
    from: "FP Solutions <noreply@fp-solutions.pl>",
    to,
    subject: `Problem z obliczeniami FDS — ${caseId}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <div style="background:#DC3545;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#fff;font-weight:900;font-size:18px;margin:0">FP Solutions</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0">Symulacje numeryczne CFD / FDS</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <div style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 16px;margin-bottom:20px">
      <p style="color:#dc2626;font-weight:700;font-size:13px;margin:0">✗ Obliczenia zakończyły się błędem</p>
    </div>
    <p style="font-size:15px;margin:0 0 16px">Cześć <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px">
      Niestety obliczenia dla pliku <strong>${fileName}</strong> zakończyły się błędem.
      Nie zostaniesz obciążony kosztami za to zlecenie.
    </p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
      Skontaktuj się z nami podając numer zlecenia — przeanalizujemy log i pomożemy
      zidentyfikować problem z plikiem FDS.
    </p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 24px;margin-bottom:24px">
      <p style="font-size:12px;color:#64748b;margin:0 0 4px">Numer zlecenia</p>
      <p style="font-family:monospace;font-weight:700;color:#DC3545;margin:0;font-size:14px">${caseId}</p>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <a href="${url}"
         style="display:inline-block;background:#0f172a;color:#fff;font-weight:700;padding:11px 22px;border-radius:10px;text-decoration:none;font-size:13px">
        Podgląd zlecenia
      </a>
      <a href="mailto:biuro@fp-solutions.pl?subject=Błąd symulacji ${caseId}"
         style="display:inline-block;background:#fff;color:#DC3545;border:1.5px solid #DC3545;font-weight:700;padding:11px 22px;border-radius:10px;text-decoration:none;font-size:13px">
        Napisz do nas
      </a>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;border-top:1px solid #e2e8f0;padding-top:16px">
      <a href="mailto:biuro@fp-solutions.pl" style="color:#DC3545">biuro@fp-solutions.pl</a>
      · <a href="tel:+48790782993" style="color:#DC3545">+48 790 782 993</a>
    </p>
  </div>
</div>`,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = params;
  const body = await req.json().catch(() => ({}));
  const { status, exitCode, log } = body as {
    status?: string;
    exitCode?: number;
    log?: string;
  };

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};

  // Zawsze zapisuj log jeśli przyszedł
  if (log) {
    try {
      updates.fds_log = Buffer.from(log, "base64").toString("utf8");
    } catch { /* ignore */ }
  }

  if (status === "running") {
    updates.status = "running";
    // started_at ustawiany osobno tylko przy pierwszym przejściu — poniżej
  } else if (status === "done" || status === "failed") {
    updates.status = status;
    updates.completed_at = new Date().toISOString();
    updates.fds_exit_code = exitCode ?? null;
  }

  const { data: row } = await supabase
    .from("fds_submissions")
    .update(updates)
    .eq("case_id", caseId)
    .select("email, name, file_name, price, wall_hours, server_type, server_id")
    .single();

  // Ustaw started_at tylko jeśli jeszcze nie ustawiony (pierwsze "running")
  if (status === "running") {
    await supabase
      .from("fds_submissions")
      .update({ started_at: new Date().toISOString() })
      .eq("case_id", caseId)
      .is("started_at", null);
  }

  // Safety net: usuń VM Hetzner przy failed (na wypadek gdy cloud-init nie zdążył się sam usunąć)
  if (status === "failed" && row?.server_id) {
    await deleteServer(row.server_id).catch((err) => {
      console.error(`complete webhook: deleteServer(${row.server_id}) error:`, err);
    });
  }

  // Email powiadomienia do klienta
  if (row && (status === "done" || status === "failed")) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailPayload = status === "done"
      ? emailDone(row.email, row.name, caseId, row.file_name, row.price, row.wall_hours, row.server_type)
      : emailFailed(row.email, row.name, caseId, row.file_name);

    await resend.emails.send(emailPayload).catch((err) => {
      console.error(`Email ${status} send error [${caseId}]:`, err);
    });
  }

  return NextResponse.json({ ok: true });
}
