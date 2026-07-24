export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

const BUCKET = "fds-files";

// Pobranie oryginalnego pliku wsadowego .fds (input) dla admina.
// Wsad leży w prywatnym buckecie Supabase Storage `fds-files` pod `file_path`
// (patrz submit route). Service-role omija RLS. Zamiast proxować bajty przez nasz
// origin, wystawiamy podpisany URL i przekierowujemy — plik leci wprost z Supabase
// do przeglądarki (bez buforowania w RAM i bez Fast Origin Transfer na Vercelu).
export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: sub, error: subErr } = await admin
    .from("fds_submissions")
    .select("file_path, file_name")
    .eq("case_id", params.caseId)
    .single();

  if (subErr || !sub?.file_path) {
    return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });
  }

  const fileName = sub.file_name || `${params.caseId}.fds`;

  // Podpisany URL Supabase + 302: przeglądarka pobiera plik wprost z magazynu.
  // Opcja `download` ustawia Content-Disposition: attachment z właściwą nazwą.
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(sub.file_path, 300, { download: fileName });

  if (signErr || !signed?.signedUrl) {
    console.error(`admin download-fds [${params.caseId}]:`, signErr);
    return NextResponse.json({ error: "Błąd pobierania pliku." }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
