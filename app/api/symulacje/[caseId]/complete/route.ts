export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

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
  const { status, exitCode, log } = body as { status: string; exitCode?: number; log?: string };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};

  if (log) {
    try {
      updates.fds_log = Buffer.from(log, "base64").toString("utf8");
    } catch { /* ignore */ }
  }

  if (status === "running" && !log) {
    updates.status = status;
    updates.started_at = new Date().toISOString();
  } else if (status === "done" || status === "failed") {
    updates.status = status;
    updates.completed_at = new Date().toISOString();
    updates.fds_exit_code = exitCode ?? null;
  }

  const { data: row } = await supabase
    .from("fds_submissions")
    .update(updates)
    .eq("case_id", caseId)
    .select("email, name, file_name, price")
    .single();

  // E-mail do klienta gdy obliczenia gotowe
  if (status === "done" && row) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await resend.emails.send({
      from: "FP Solutions <noreply@fp-solutions.pl>",
      to: row.email,
      subject: `Obliczenia FDS gotowe — ${caseId}`,
      html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <div style="background:#DC3545;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#fff;font-weight:900;font-size:18px;margin:0">FP Solutions</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;margin:0 0 16px">Cześć <strong>${row.name}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
      Obliczenia dla pliku <strong>${row.file_name}</strong> zostały zakończone pomyślnie.
      Wyniki możesz pobrać w panelu:
    </p>
    <a href="${appUrl}/narzedzia/symulacje/${caseId}"
       style="display:inline-block;background:#DC3545;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px">
      Pobierz wyniki →
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">
      Zlecenie: <code>${caseId}</code>
    </p>
  </div>
</div>`,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
