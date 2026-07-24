export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  listResults, signedResultUrl, getResultText,
  isInternalResult, SNAPSHOT_MANIFEST,
} from "@/lib/hetzner/storage";

// Lista plików wynikowych dostępnych W DANEJ CHWILI w magazynie — również w trakcie
// obliczeń, bo maszyna licząca wrzuca migawki co ~2 min (patrz snapshot_results
// w lib/hetzner/cloud-init.ts). Dzięki temu użytkownik pobiera wyniki bez
// zatrzymywania symulacji.
//
// Osobny endpoint (a nie pole w GET /api/symulacje/[caseId]), bo tamten jest
// odpytywany co 3 s i nie chcemy przy każdym pollingu robić LIST po magazynie.
export async function GET(
  _req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("fds_submissions")
      .select("status")
      .eq("case_id", caseId)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Nie znaleziono zlecenia." }, { status: 404 });
    }

    const files = await listResults(caseId);
    const hasManifest = files.some((f) => (f.Key ?? "").endsWith(`/${SNAPSHOT_MANIFEST}`));

    const results = await Promise.all(
      files
        .filter((f) => f.Key && !isInternalResult((f.Key as string).split("/").pop() ?? ""))
        .map(async (f) => ({
          name: (f.Key as string).split("/").pop() as string,
          url: await signedResultUrl(f.Key as string),
          size: f.Size ?? null,
          createdAt: f.LastModified?.toISOString() ?? null,
        }))
    );
    results.sort((a, b) => a.name.localeCompare(b.name));

    // Do jakiego czasu symulacji sięga migawka (zapisane przez maszynę liczącą).
    let snapshot: { t: number; at: string | null } | null = null;
    if (hasManifest) {
      const raw = await getResultText(`results/${caseId}/${SNAPSHOT_MANIFEST}`);
      if (raw) {
        try {
          const m = JSON.parse(raw);
          // t < 0 => maszyna licząca nie odczytała czasu z logu (nieznany zakres).
          if (typeof m?.t === "number" && Number.isFinite(m.t) && m.t >= 0) {
            snapshot = { t: m.t, at: typeof m.at === "string" ? m.at : null };
          }
        } catch { /* uszkodzony manifest — pomijamy metadane */ }
      }
    }

    return NextResponse.json({
      status: data.status,
      partial: data.status !== "done",
      snapshot,
      results,
    });
  } catch (err) {
    console.error(`GET /api/symulacje/${caseId}/results:`, err);
    return NextResponse.json({ error: "Błąd magazynu." }, { status: 502 });
  }
}
