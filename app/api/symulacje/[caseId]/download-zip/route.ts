export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro+ respektuje; gdzie indziej ignorowane

import { NextRequest, NextResponse } from "next/server";
import { PassThrough, Readable } from "stream";
import archiverDefault, { type Archiver } from "archiver";
import { listResults, signedResultUrl } from "@/lib/hetzner/storage";

// @types/archiver typuje tylko klasy; runtime eksportuje fabrykę archiver("zip", …).
const archiver = archiverDefault as unknown as (format: string, options?: Record<string, unknown>) => Archiver;

// Streamowy ZIP wyników — pobiera pliki z magazynu po stronie serwera i pakuje
// w locie (STORE, bez kompresji), strumieniując paczkę do przeglądarki. Nic nie
// jest buforowane w całości, więc działa DLA DOWOLNEGO ROZMIARU (bez OOM w kliencie).
// Opcjonalny wybór: ?files=nazwa1.csv,nazwa2.smv (nazwy bez ścieżki).
export async function GET(req: NextRequest, { params }: { params: { caseId: string } }) {
  const { caseId } = params;
  const filesParam = req.nextUrl.searchParams.get("files");
  const wanted = filesParam
    ? new Set(filesParam.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  let entries: Array<{ key: string; name: string }>;
  try {
    const objects = await listResults(caseId);
    entries = objects
      .filter((o) => o.Key)
      .map((o) => ({ key: o.Key as string, name: (o.Key as string).split("/").pop() as string }))
      .filter((e) => e.name && (!wanted || wanted.has(e.name)));
  } catch (err) {
    console.error(`download-zip listResults [${caseId}]:`, err);
    return NextResponse.json({ error: "Błąd magazynu." }, { status: 502 });
  }
  if (!entries.length) {
    return NextResponse.json({ error: "Brak plików do spakowania." }, { status: 404 });
  }

  const archive = archiver("zip", { store: true });
  const pass = new PassThrough();
  archive.on("warning", (err) => console.warn(`download-zip warn [${caseId}]:`, err?.message));
  archive.on("error", (err) => console.error(`download-zip error [${caseId}]:`, err?.message));
  archive.pipe(pass);

  // Doklejaj pliki po kolei: pobierz strumień z magazynu i doczekaj końca wpisu,
  // zanim ruszy następny (jedno połączenie naraz, stała pamięć, backpressure).
  (async () => {
    try {
      for (const e of entries) {
        let body: ReadableStream<Uint8Array> | null = null;
        try {
          const url = await signedResultUrl(e.key, 900);
          const resp = await fetch(url);
          if (!resp.ok || !resp.body) continue;
          body = resp.body;
        } catch (err) {
          console.error(`download-zip fetch [${caseId}/${e.name}]:`, err);
          continue;
        }
        const entryDone = new Promise<void>((res) => archive.once("entry", () => res()));
        archive.append(Readable.fromWeb(body as unknown as Parameters<typeof Readable.fromWeb>[0]), { name: e.name });
        await entryDone;
      }
      await archive.finalize();
    } catch (err) {
      console.error(`download-zip stream [${caseId}]:`, err);
      archive.destroy(err as Error);
    }
  })();

  const webStream = Readable.toWeb(pass) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${caseId}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
