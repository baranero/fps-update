export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createServer, resolveServerLocation, fetchLiveCatalog } from "@/lib/hetzner/client";
import { generateCloudInit } from "@/lib/hetzner/cloud-init";
import { parseFds, planToEstimate, toPlanInput, type FdsParseResult } from "@/lib/fds/parser";
import { findPlan, planRuns, type RunPlan } from "@/lib/fds/planner";
import { getCalibration } from "@/lib/fds/calibration";
import { injectMpiProcess } from "@/lib/fds/mpi";
import { runFilePathFor } from "@/lib/fds/runFile";
import { serverLabel } from "@/lib/hetzner/catalog";
import { isSimAllowed } from "@/lib/utils/adminCheck";
import { MAIL_FROM, caseUrl, formatHours, formatMoney, mailCopy, mailLocale, type MailLocale } from "@/lib/mail";

const BUCKET = "fds-files";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — twardy limit rozmiaru pliku .fds
// Ani liczby równoległych zleceń, ani ich liczby na godzinę nie ograniczamy:
// każde zlecenie dostaje własną maszynę, więc symulacje nie konkurują ze sobą
// o zasoby, a dostęp do uruchamiania i tak przechodzi przez `isSimAllowed`.

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // usuń znaki diakrytyczne
    .replace(/\s+/g, "_")              // spacje → podkreślniki
    .replace(/[^a-zA-Z0-9._-]/g, "_") // pozostałe niedozwolone znaki → podkreślnik
    .replace(/_+/g, "_");              // wielokrotne podkreślniki → jedno
}

// ─── Zapis odporny na nieuruchomioną migrację ────────────────────────────────
//
// Kolumny przybywają razem z migracjami, a te bywają uruchamiane po wdrożeniu
// kodu. Zamiast wywracać całe zlecenie, wycinamy brakującą kolumnę wskazaną
// przez bazę i próbujemy ponownie — zlecenie przechodzi, tracąc jedynie pole,
// którego i tak nie było gdzie zapisać.

/** Nazwa kolumny z komunikatu Postgresa/PostgREST — null, gdy błąd jest inny. */
function missingColumnName(message: string | undefined): string | null {
  if (!message) return null;
  const pg = message.match(/column\s+(?:"?[\w.]*?"?\.)?"?([a-z_][a-z0-9_]*)"?\s+does not exist/i);
  if (pg) return pg[1];
  const rest = message.match(/could not find the '([a-z_][a-z0-9_]*)' column/i);
  return rest ? rest[1] : null;
}

/**
 * Wykonuje zapis, po każdym błędzie „brak kolumny" usuwając wskazane pole.
 * Limit prób chroni przed pętlą, gdyby baza zgłaszała coś, czego nie umiemy wyciąć.
 */
async function writeTolerantly<T extends Record<string, unknown>>(
  row: T,
  attempt: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>,
  label: string
): Promise<{ error: { message: string } | null }> {
  const payload: Record<string, unknown> = { ...row };

  for (let i = 0; i <= 8; i++) {
    const { error } = await attempt(payload);
    if (!error) return { error: null };

    const column = missingColumnName(error.message);
    if (!column || !(column in payload)) return { error };

    console.error(`${label}: baza nie zna kolumny "${column}" — pomijam ją (uruchom zaległe migracje).`);
    delete payload[column];
  }

  return { error: { message: "Zbyt wiele brakujących kolumn — uruchom migracje bazy." } };
}

function generateCaseId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FDS-${ts}-${rnd}`;
}

function emailUser(to: string, name: string, caseId: string, fileName: string, price: number, wallHours: number, serverType: string, appUrl: string, locale: MailLocale) {
  const statusUrl = caseUrl(appUrl, caseId, locale);
  const wallStr = formatHours(wallHours, locale);
  const c = mailCopy(locale);
  return {
    from: MAIL_FROM,
    to,
    subject: c.submitSubject(caseId),
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <div style="background:#DC3545;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#fff;font-weight:900;font-size:18px;margin:0">FP Solutions</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0">${c.brandSub}</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;margin:0 0 16px">${c.hi(name)}</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
      ${c.submitIntro}
    </p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#64748b;width:50%">${c.caseNo}</td><td style="font-weight:700;font-family:monospace">${caseId}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">${c.file}</td><td style="font-weight:600">${fileName}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">${c.server}</td><td style="font-weight:600">${serverLabel(serverType).label}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">${c.estTime}</td><td style="font-weight:600">${wallStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">${c.priceNet}</td><td style="font-weight:700;color:#DC3545;font-size:15px">${formatMoney(price, locale)}</td></tr>
      </table>
    </div>
    <a href="${statusUrl}" style="display:inline-block;background:#DC3545;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;margin-bottom:24px">
      ${c.submitCta}
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;word-break:break-all">
      ${statusUrl}
    </p>
    <p style="font-size:13px;color:#64748b;margin:0">
      ${c.questions} <a href="mailto:biuro@fp-solutions.pl" style="color:#DC3545">biuro@fp-solutions.pl</a> · <a href="tel:+48790782993" style="color:#DC3545">+48 790 782 993</a>
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
  parsed: FdsParseResult,
  price: number,
  plan: RunPlan,
  wallHours: number,
  appUrl: string
) {
  const serverType = plan.serverType;
  const statusUrl = `${appUrl}/symulacje/${caseId}`;
  return {
    from: MAIL_FROM,
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
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Siatki</td><td>${parsed.meshCount}${parsed.forcedProcs ? ` (MPI_PROCESS → ${parsed.forcedProcs} proc.)` : ""}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Procesy MPI</td><td>${plan.mpiProcs} × ${plan.ompThreads} OMP — po ${plan.meshesPerProc} ${plan.meshesPerProc === 1 ? "siatce" : "siatki"} na proces</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Balans obciążenia</td><td>${(plan.balance * 100).toFixed(0)}%${plan.warnings.includes("unbalanced") ? " ⚠ nierówny podział" : ""}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Komórki</td><td>${parsed.totalCells.toLocaleString("pl-PL")}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">T_END</td><td>${parsed.tEnd} s</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Paliwo</td><td>${parsed.fuel ?? "—"}</td></tr>
    </table>

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin:0 0 10px">Wycena</h3>
    <table style="font-size:13px;border-collapse:collapse">
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Serwer</td><td style="text-transform:uppercase">${serverType}</td><td style="padding-left:8px;color:#94a3b8">${plan.cores} vCPU / ${plan.ramGb} GB${plan.tier ? ` · wariant ${plan.tier}` : ""}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Czas obliczeń (est.)</td><td>${wallHours < 1 ? `${Math.round(wallHours * 60)} min` : `${wallHours.toFixed(1)} h`}</td><td style="padding-left:8px;color:#94a3b8">widełki ${plan.wallLoHours.toFixed(1)}–${plan.wallHiHours.toFixed(1)} h</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Koszt chmury</td><td>€${plan.cloudCostEur.toFixed(3)}</td><td style="padding-left:8px;color:#94a3b8">+ €${plan.storageCostEur.toFixed(3)} magazyn</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#64748b">Cena netto</td><td style="font-weight:700;font-size:15px">${price.toLocaleString("pl-PL")} zł</td></tr>
    </table>
  </div>
</div>`,
  };
}

async function dispatchHetzner(
  caseId: string,
  /** Ścieżka pliku, który ma policzyć maszyna — kopia uruchomieniowa, gdy siatki
   *  wymagały przypisania do procesów; w przeciwnym razie oryginał klienta. */
  filePath: string,
  fileName: string,
  plan: RunPlan
) {
  const supabase = createAdminClient();
  const serverType = plan.serverType;
  const location = await resolveServerLocation(serverType);

  const userData = generateCloudInit({
    caseId,
    filePath,
    fileName,
    // Procesów MPI tyle, ile wynika z planu — NIE tyle, ile siatek. Gdy siatek
    // jest więcej niż procesów, FDS rozdziela je między procesy sam.
    ncores: plan.mpiProcs,
    ompThreads: plan.ompThreads,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    webhookSecret: process.env.WEBHOOK_SECRET ?? "",
    hetznerToken: process.env.HETZNER_API_TOKEN ?? "",
    fdsDownloadUrl: process.env.FDS_DOWNLOAD_URL ?? "",
    storageAccessKey: process.env.HETZNER_STORAGE_ACCESS_KEY ?? "",
    storageSecretKey: process.env.HETZNER_STORAGE_SECRET_KEY ?? "",
    storageBucket: process.env.HETZNER_STORAGE_BUCKET ?? "",
    storageEndpoint: process.env.HETZNER_STORAGE_ENDPOINT ?? "",
    storageRegion: process.env.HETZNER_STORAGE_REGION ?? "eu-central-003",
  });

  const server = await createServer(caseId, serverType, location, userData);

  const dispatched = {
    status: "dispatched",
    server_id: server.id,
    server_type: serverType,
    server_location: location,
    dispatched_at: new Date().toISOString(),
  };

  // Maszyna już liczy — zlecenie MUSI dostać status, inaczej zostałoby "pending"
  // z działającą maszyną w tle.
  const { error } = await writeTolerantly(
    dispatched,
    (row) => supabase.from("fds_submissions").update(row).eq("case_id", caseId),
    "submit/dispatch"
  );
  if (error) console.error("submit: zapis statusu dispatched nieudany:", error.message);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const file = form.get("file") as File | null;
    const notes = (form.get("notes") as string | null)?.trim() || null;
    // Język zlecenia — decyduje o języku maili (także tego wysyłanego później
    // przez maszynę liczącą, która nie zna sesji ani nagłówków przeglądarki).
    const locale = mailLocale(form.get("locale"));

    if (!file) {
      return NextResponse.json({ error: "Brak pliku." }, { status: 400 });
    }
    if (!file.name.endsWith(".fds")) {
      return NextResponse.json({ error: "Akceptowane są tylko pliki .fds." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Plik jest za duży (maks. 25 MB)." }, { status: 400 });
    }

    // Zlecenie uruchamia płatny serwer w chmurze → wymagane logowanie
    const userClient = createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    // Dostęp do uruchamiania symulacji tymczasowo ograniczony — zanim wdrożymy
    // płatności, płatny serwer w chmurze może odpalić wyłącznie zaufany użytkownik.
    if (!isSimAllowed(user.email)) {
      return NextResponse.json(
        { error: "Uruchamianie symulacji jest obecnie dostępne wyłącznie dla wybranych klientów. Skontaktuj się z nami: biuro@fp-solutions.pl" },
        { status: 403 }
      );
    }

    const userId = user.id;
    const name = (form.get("name") as string | null)?.trim() || user.email?.split("@")[0] || "Użytkownik";
    const email = (form.get("email") as string | null)?.trim() || user.email || "";

    const supabase = createAdminClient();

    // Źródło prawdy: plik parsujemy i wyceniamy po stronie serwera.
    // Dane z klienta służą wyłącznie jako podgląd i nie są tu przyjmowane.
    const fileBuffer = await file.arrayBuffer();
    const content = new TextDecoder("utf-8").decode(fileBuffer);
    const parsed = parseFds(content);
    if (!parsed.valid) {
      return NextResponse.json({ error: parsed.error ?? "Nieprawidłowy plik FDS." }, { status: 400 });
    }
    // Dobór maszyny — źródłem prawdy jest planer po stronie serwera, liczony na
    // świeżo sparsowanym pliku i żywej ofercie dostawcy. Wybór z formularza jest
    // wyłącznie wskazówką: musi trafić w jeden z wariantów, inaczej go ignorujemy.
    const [catalog, calibration] = await Promise.all([
      fetchLiveCatalog().catch((err) => {
        console.error("submit: odczyt oferty dostawcy nieudany:", err);
        return null;
      }),
      getCalibration(),
    ]);

    const planResult = planRuns(toPlanInput(parsed), {
      availableTypes: catalog ? Object.keys(catalog.locationByType) : null,
      prices: catalog?.priceByType ?? null,
      calibration,
    });

    const requestedType = (form.get("serverType") as string | null)?.trim().toLowerCase() || null;
    const plan = findPlan(planResult, requestedType) ?? planResult.balanced;

    if (!plan) {
      // Model nie mieści się na żadnej dostępnej maszynie — mówimy o tym wprost,
      // zamiast przyjmować zlecenie, które i tak padnie przy uruchamianiu.
      const reason =
        planResult.blocked === "ramTooSmall"
          ? "Model wymaga więcej pamięci, niż oferuje największa dostępna maszyna. Napisz do nas — dobierzemy sprzęt indywidualnie."
          : planResult.blocked === "forcedProcs"
          ? `Plik przypisuje siatki do ${parsed.forcedProcs} procesów przez MPI_PROCESS, a tylu rdzeni nie da się teraz zestawić. Usuń MPI_PROCESS albo zmniejsz liczbę procesów.`
          : "Nie udało się dobrać maszyny dla tego modelu. Napisz do nas — pomożemy.";
      return NextResponse.json({ error: reason }, { status: 422 });
    }

    const estimate = planToEstimate(plan, {
      dtEstimate: planResult.dtEstimate,
      cellDimSource: planResult.cellDimSource,
      totalCells: parsed.totalCells,
    });

    const caseId = generateCaseId();

    // Upload file to Supabase Storage
    const safeFileName = sanitizeFileName(file.name);
    const filePath = `${caseId}/${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, { contentType: "text/plain", upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Błąd przesyłania pliku." }, { status: 500 });
    }

    // Insert submission record
    const submission = {
      case_id: caseId,
      user_id: userId,
      name,
      email,
      notes,
      file_name: file.name,
      file_path: filePath,
      file_size_kb: Math.round(file.size / 1024),
      locale,
      chid: parsed.chid ?? null,
      mesh_count: parsed.meshCount,
      total_cells: parsed.totalCells,
      t_end: parsed.tEnd,
      fuel: parsed.fuel ?? null,
      obst_count: parsed.obstCount,
      vent_count: parsed.ventCount,
      devc_count: parsed.devcCount,
      devc_setpoints: parsed.devcs,
      vcpu_hours: estimate.vcpuHours,
      wall_hours: estimate.wallHours,
      price: estimate.price,
      complexity: estimate.complexity,
      // Plan i geometria — bez nich nie da się później porównać predykcji
      // z rzeczywistością ani przeliczyć kalibracji (lib/fds/calibration.ts).
      server_type: plan.serverType,
      server_cores: plan.cores,
      mpi_procs: plan.mpiProcs,
      omp_threads: plan.ompThreads,
      meshes_per_proc: plan.meshesPerProc,
      min_cell_dim: parsed.minCellDim,
      domain_volume: parsed.domainVolume,
      dt_estimate: planResult.dtEstimate,
      predicted_wall_hours: plan.wallHours,
      plan_tier: plan.tier,
    };

    const { error: dbError } = await writeTolerantly(
      submission,
      (row) => supabase.from("fds_submissions").insert(row),
      "submit/insert"
    );

    if (dbError) {
      console.error("DB insert error:", dbError);
      // Clean up uploaded file on DB failure
      await supabase.storage.from(BUCKET).remove([filePath]);
      return NextResponse.json({ error: "Błąd zapisu zgłoszenia." }, { status: 500 });
    }

    // Gdy procesów jest mniej niż siatek, FDS wymaga jawnego przypisania siatek
    // do procesów (ERROR 115) — dopisujemy je do KOPII pliku. Oryginał klienta
    // zostaje w magazynie nietknięty: to jego pobiera i ogląda.
    let runFilePath = filePath;
    if (plan.mpiProcs < parsed.meshCount && parsed.forcedProcs === null) {
      const { content: runContent, injected } = injectMpiProcess(
        content,
        parsed.meshDetails.map((m) => m.cells),
        plan.mpiProcs
      );
      if (injected > 0) {
        const candidate = runFilePathFor(filePath);
        const { error: runUploadError } = await supabase.storage
          .from(BUCKET)
          .upload(candidate, runContent, { contentType: "text/plain", upsert: true });

        if (runUploadError) {
          console.error("submit: zapis kopii uruchomieniowej nieudany:", runUploadError);
          return NextResponse.json(
            { error: "Nie udało się przygotować modelu do obliczeń. Spróbuj ponownie." },
            { status: 500 }
          );
        }
        runFilePath = candidate;
      }
    }

    // Send emails (non-blocking)
    const resend = new Resend(process.env.RESEND_API_KEY);
    const adminEmail = process.env.ADMIN_EMAIL ?? "biuro@fp-solutions.pl";

    await Promise.allSettled([
      resend.emails.send(emailUser(email, name, caseId, file.name, estimate.price, estimate.wallHours, plan.serverType, process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com", locale)),
      resend.emails.send(emailAdmin(adminEmail, caseId, name, email, notes, file.name, filePath, parsed, estimate.price, plan, estimate.wallHours, process.env.NEXT_PUBLIC_APP_URL ?? "https://fdsrun.com")),
    ]);

    // Uruchomienie maszyny liczącej
    try {
      await dispatchHetzner(caseId, runFilePath, file.name, plan);
    } catch (err) {
      console.error("Hetzner dispatch error:", err);
      // Zlecenie nie może zostać "pending" na zawsze — ale klient też nie może
      // dostać 201 i dowiedzieć się o porażce dopiero z karty zlecenia.
      await supabase
        .from("fds_submissions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          fds_log: `Nie udało się uruchomić maszyny obliczeniowej.\n${err instanceof Error ? err.message : String(err)}`,
        })
        .eq("case_id", caseId);

      return NextResponse.json(
        {
          caseId,
          error: "Nie udało się uruchomić maszyny obliczeniowej. Zlecenie zostało zapisane — spróbuj ponownie za chwilę lub napisz do nas.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ caseId }, { status: 201 });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera." }, { status: 500 });
  }
}
