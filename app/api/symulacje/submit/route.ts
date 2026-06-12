export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import { createServer, selectServerType } from "@/lib/hetzner/client";
import { generateCloudInit } from "@/lib/hetzner/cloud-init";

const BUCKET = "fds-files";

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // usuń znaki diakrytyczne
    .replace(/\s+/g, "_")              // spacje → podkreślniki
    .replace(/[^a-zA-Z0-9._-]/g, "_") // pozostałe niedozwolone znaki → podkreślnik
    .replace(/_+/g, "_");              // wielokrotne podkreślniki → jedno
}

function generateCaseId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FDS-${ts}-${rnd}`;
}

function emailUser(to: string, name: string, caseId: string, fileName: string, price: number, vcpuHours: number, appUrl: string) {
  const statusUrl = `${appUrl}/narzedzia/symulacje/${caseId}`;
  return {
    from: "FP Solutions <noreply@fp-solutions.pl>",
    to,
    subject: `Potwierdzenie zlecenia symulacji FDS — ${caseId}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <div style="background:#DC3545;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#fff;font-weight:900;font-size:18px;margin:0">FP Solutions</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0">Symulacje numeryczne CFD / FDS</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;margin:0 0 16px">Cześć <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
      Twoje zlecenie zostało przyjęte i trafiło do kolejki. Postęp obliczeń możesz śledzić pod poniższym linkiem — strona odświeża się automatycznie.
    </p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#64748b;width:50%">Numer zlecenia</td><td style="font-weight:700;font-family:monospace">${caseId}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Plik</td><td style="font-weight:600">${fileName}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Szacowane vCPU-hours</td><td style="font-weight:600">${vcpuHours.toFixed(1)} h</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Cena netto</td><td style="font-weight:700;color:#DC3545;font-size:15px">${price.toLocaleString("pl-PL")} zł</td></tr>
      </table>
    </div>
    <a href="${statusUrl}" style="display:inline-block;background:#DC3545;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;margin-bottom:24px">
      Śledź status zlecenia →
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;word-break:break-all">
      ${statusUrl}
    </p>
    <p style="font-size:13px;color:#64748b;margin:0">
      Pytania: <a href="mailto:biuro@fp-solutions.pl" style="color:#DC3545">biuro@fp-solutions.pl</a> · <a href="tel:+48790782993" style="color:#DC3545">+48 790 782 993</a>
    </p>
  </div>
</div>`,
  };
}

function emailAdmin(
  adminEmail: string,
  caseId: string,
  name: string,
  email: string,
  notes: string | null,
  fileName: string,
  filePath: string,
  parsed: Record<string, unknown>,
  price: number,
  vcpuHours: number,
  appUrl: string
) {
  const statusUrl = `${appUrl}/narzedzia/symulacje/${caseId}`;
  return {
    from: "FP Solutions <noreply@fp-solutions.pl>",
    to: adminEmail,
    subject: `Nowe zlecenie FDS — ${caseId}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0f172a;padding:20px 28px;border-radius:10px 10px 0 0">
    <p style="color:#fff;font-weight:900;margin:0">Nowe zlecenie FDS</p>
    <p style="color:#64748b;font-size:12px;margin:4px 0 0;font-family:monospace">${caseId}</p>
    <a href="${statusUrl}" style="display:inline-block;margin-top:10px;background:#DC3545;color:#fff;text-decoration:none;font-size:12px;font-weight:700;padding:6px 14px;border-radius:6px">Panel zlecenia →</a>
  </div>
  <div style="background:#f8fafc;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin:0 0 10px">Klient</h3>
    <table style="font-size:13px;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Imię i nazwisko</td><td style="font-weight:600">${name}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">E-mail</td><td><a href="mailto:${email}" style="color:#DC3545">${email}</a></td></tr>
      ${notes ? `<tr><td style="padding:4px 16px 4px 0;color:#64748b">Uwagi</td><td>${notes}</td></tr>` : ""}
    </table>

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin:0 0 10px">Plik FDS</h3>
    <table style="font-size:13px;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Nazwa</td><td style="font-family:monospace">${fileName}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Ścieżka (Storage)</td><td style="font-family:monospace;font-size:11px">${filePath}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">CHID</td><td>${parsed.chid ?? "—"}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Siatki (MPI)</td><td>${parsed.meshCount}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Wątki OMP</td><td>${(parsed as Record<string,unknown>).ompThreads ?? 1}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Łączne rdzenie</td><td>${(parsed as Record<string,unknown>).totalCores ?? parsed.meshCount}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Komórki</td><td>${(parsed.totalCells as number).toLocaleString("pl-PL")}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">T_END</td><td>${parsed.tEnd} s</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Paliwo</td><td>${parsed.fuel ?? "—"}</td></tr>
    </table>

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin:0 0 10px">Wycena</h3>
    <table style="font-size:13px;border-collapse:collapse">
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">vCPU-hours</td><td>${vcpuHours.toFixed(1)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Cena netto</td><td style="font-weight:700;font-size:15px">${price.toLocaleString("pl-PL")} zł</td></tr>
    </table>
  </div>
</div>`,
  };
}

async function dispatchHetzner(
  caseId: string,
  filePath: string,
  fileName: string,
  meshCount: number,
  ompThreads: number
) {
  const supabase = createAdminClient();
  const totalCores = meshCount * ompThreads;
  const { type: serverType, cores } = selectServerType(totalCores);

  const userData = generateCloudInit({
    caseId,
    filePath,
    fileName,
    ncores: meshCount,   // MPI: jeden proces na siatkę
    ompThreads,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    webhookSecret: process.env.WEBHOOK_SECRET ?? "",
    hetznerToken: process.env.HETZNER_API_TOKEN ?? "",
    fdsDownloadUrl: process.env.FDS_DOWNLOAD_URL ?? "",
  });

  const server = await createServer(caseId, serverType, userData);

  await supabase.from("fds_submissions").update({
    status: "dispatched",
    server_id: server.id,
    server_type: serverType,
    dispatched_at: new Date().toISOString(),
  }).eq("case_id", caseId);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const file = form.get("file") as File | null;
    const name = (form.get("name") as string | null)?.trim();
    const email = (form.get("email") as string | null)?.trim();
    const notes = (form.get("notes") as string | null)?.trim() || null;
    const parsedRaw = form.get("parsed") as string | null;
    const estimateRaw = form.get("estimate") as string | null;

    if (!file || !name || !email || !parsedRaw || !estimateRaw) {
      return NextResponse.json({ error: "Brakujące dane formularza." }, { status: 400 });
    }

    if (!file.name.endsWith(".fds")) {
      return NextResponse.json({ error: "Akceptowane są tylko pliki .fds." }, { status: 400 });
    }

    const parsed = JSON.parse(parsedRaw);
    const estimate = JSON.parse(estimateRaw);

    const supabase = createAdminClient();
    const caseId = generateCaseId();

    // Upload file to Supabase Storage
    const safeFileName = sanitizeFileName(file.name);
    const filePath = `${caseId}/${safeFileName}`;
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, { contentType: "text/plain", upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Błąd przesyłania pliku." }, { status: 500 });
    }

    // Insert submission record
    const { error: dbError } = await supabase.from("fds_submissions").insert({
      case_id: caseId,
      name,
      email,
      notes,
      file_name: file.name,
      file_path: filePath,
      file_size_kb: Math.round(file.size / 1024),
      chid: parsed.chid ?? null,
      mesh_count: parsed.meshCount,
      total_cells: parsed.totalCells,
      t_end: parsed.tEnd,
      fuel: parsed.fuel ?? null,
      obst_count: parsed.obstCount,
      vent_count: parsed.ventCount,
      devc_count: parsed.devcCount,
      vcpu_hours: estimate.vcpuHours,
      wall_hours: estimate.wallHours,
      price: estimate.price,
      complexity: estimate.complexity,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      // Clean up uploaded file on DB failure
      await supabase.storage.from(BUCKET).remove([filePath]);
      return NextResponse.json({ error: "Błąd zapisu zgłoszenia." }, { status: 500 });
    }

    // Send emails (non-blocking)
    const resend = new Resend(process.env.RESEND_API_KEY);
    const adminEmail = process.env.ADMIN_EMAIL ?? "biuro@fp-solutions.pl";

    await Promise.allSettled([
      resend.emails.send(emailUser(email, name, caseId, file.name, estimate.price, estimate.vcpuHours, process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-solutions.pl")),
      resend.emails.send(emailAdmin(adminEmail, caseId, name, email, notes, file.name, filePath, parsed, estimate.price, estimate.vcpuHours, process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-solutions.pl")),
    ]);

    // Dispatch Hetzner server (non-blocking — nie blokuje odpowiedzi)
    dispatchHetzner(caseId, filePath, file.name, parsed.meshCount ?? 1, parsed.ompThreads ?? 1).catch((err) =>
      console.error("Hetzner dispatch error:", err)
    );

    return NextResponse.json({ caseId }, { status: 201 });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera." }, { status: 500 });
  }
}
