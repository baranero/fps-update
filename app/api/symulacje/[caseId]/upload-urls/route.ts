export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { signedUploadUrl } from "@/lib/hetzner/storage";
import { MAX_UPLOAD_KEYS, resultObjectKey } from "@/lib/hetzner/uploadKeys";
import { JOB_TOKEN_HEADER, verifyJobToken } from "@/lib/jobToken";

// Podpisane adresy PUT dla maszyny liczącej.
//
// Maszyna nie ma kluczy magazynu (patrz lib/jobToken.ts). Zamiast tego przed
// każdą partią plików — migawką w trakcie obliczeń, ujęciami Smokeview, finalnym
// uploadem — pyta tutaj o adresy. Serwis podpisuje wyłącznie klucze pod
// `results/<caseId>/` i wyłącznie dla zlecenia, które jeszcze liczy: po
// zamknięciu zlecenia token przestaje otwierać cokolwiek.
//
// Odpowiedź: { urls: { "<nazwa>": "<adres PUT>", … } } — nazwy niedopuszczalne
// są pomijane, nie zrywają całej partii.

const UPLOAD_URL_TTL_S = 900;
/** Stany, w których maszyna ma prawo jeszcze cokolwiek dosyłać. */
const LIVE_STATUSES = new Set(["dispatched", "running"]);

export async function POST(req: NextRequest, props: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await props.params;

  if (!verifyJobToken(caseId, req.headers.get(JOB_TOKEN_HEADER))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { files?: unknown };
  const files = Array.isArray(body.files) ? body.files : null;
  if (!files || files.length === 0 || files.length > MAX_UPLOAD_KEYS) {
    return NextResponse.json({ error: "Zła lista plików." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("fds_submissions")
    .select("status")
    .eq("case_id", caseId)
    .maybeSingle();

  if (!row || !LIVE_STATUSES.has(row.status)) {
    // Zlecenie zamknięte (także przez nadzorcę) — maszyna nie dopisze już nic.
    return NextResponse.json({ error: "Zlecenie nie przyjmuje plików." }, { status: 409 });
  }

  const urls: Record<string, string> = {};
  await Promise.all(
    files.map(async (name) => {
      const key = resultObjectKey(caseId, name);
      if (!key) return;
      try {
        urls[name as string] = await signedUploadUrl(key, UPLOAD_URL_TTL_S);
      } catch (err) {
        console.error(`upload-urls [${caseId}] podpis ${key}:`, err);
      }
    })
  );

  return NextResponse.json({ urls }, { headers: { "Cache-Control": "no-store" } });
}
