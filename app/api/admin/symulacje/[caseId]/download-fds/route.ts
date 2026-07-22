export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/adminCheck";

const BUCKET = "fds-files";

// Pobranie oryginalnego pliku wsadowego .fds (input) dla admina.
// Wsad leży w prywatnym buckecie Supabase Storage `fds-files` pod `file_path`
// (patrz submit route). Service-role omija RLS. Strumieniujemy z naszego origin
// z nagłówkiem attachment, żeby przeglądarka od razu zapisała plik.
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

  const { data: blob, error: dlErr } = await admin.storage
    .from(BUCKET)
    .download(sub.file_path);

  if (dlErr || !blob) {
    console.error(`admin download-fds [${params.caseId}]:`, dlErr);
    return NextResponse.json({ error: "Błąd pobierania pliku." }, { status: 404 });
  }

  const fileName = sub.file_name || `${params.caseId}.fds`;
  const buffer = await blob.arrayBuffer();

  const headers = new Headers();
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("Content-Length", String(buffer.byteLength));
  // filename oraz filename* (RFC 5987) — poprawne polskie znaki w nazwie
  headers.set(
    "Content-Disposition",
    `attachment; filename="${fileName.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );
  headers.set("Cache-Control", "private, max-age=0, no-store");

  return new Response(buffer, { status: 200, headers });
}
