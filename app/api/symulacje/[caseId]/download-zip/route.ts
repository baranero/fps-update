export const dynamic = "force-dynamic";
// Plan Pro. 300 s to bezpieczny sufit niezależnie od Fluid compute — z włączonym
// Fluid można podnieść do 800 s. Paczka musi zmieścić się w tym oknie, dlatego
// UI pozwala zejść z jej rozmiarem, gdy łącze nie wyrabia (PACKAGE_SIZE_OPTIONS).
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { PassThrough, Readable } from "stream";
import archiverDefault, { type Archiver } from "archiver";
import { listResults, signedResultUrl, isInternalResult } from "@/lib/hetzner/storage";
import { PACKAGE_MAX_BYTES } from "@/lib/fds/download-limits";

// @types/archiver typuje tylko klasy; runtime eksportuje fabrykę archiver("zip", …).
const archiver = archiverDefault as unknown as (format: string, options?: Record<string, unknown>) => Archiver;

// Streamowy ZIP wyników — pobiera pliki z magazynu po stronie serwera i pakuje
// w locie (STORE, bez kompresji), strumieniując paczkę do przeglądarki. Nic nie
// jest buforowane w całości, więc pamięć jest stała niezależnie od rozmiaru.
// Parametry: ?files=nazwa1.csv,nazwa2.smv (nazwy bez ścieżki),
//            ?part=2&parts=4 (numeracja paczki w nazwie pliku).
export async function GET(req: NextRequest, { params }: { params: { caseId: string } }) {
  const { caseId } = params;
  const filesParam = req.nextUrl.searchParams.get("files");
  const wanted = filesParam
    ? new Set(filesParam.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  // Numer paczki trafia tylko do nazwy pliku — zawartość wynika z ?files.
  const partNo = Number(req.nextUrl.searchParams.get("part"));
  const partCount = Number(req.nextUrl.searchParams.get("parts"));
  const numbered =
    Number.isInteger(partNo) && Number.isInteger(partCount) &&
    partCount > 1 && partNo >= 1 && partNo <= partCount;
  const zipName = numbered ? `${caseId}_cz${partNo}z${partCount}.zip` : `${caseId}.zip`;

  let entries: Array<{ key: string; name: string; size: number }>;
  try {
    const objects = await listResults(caseId);
    entries = objects
      .filter((o) => o.Key)
      .map((o) => ({
        key: o.Key as string,
        name: (o.Key as string).split("/").pop() as string,
        size: o.Size ?? 0,
      }))
      // Pliki służbowe (manifest migawki) nigdy nie trafiają do paczki.
      .filter((e) => e.name && !isInternalResult(e.name) && (!wanted || wanted.has(e.name)));
  } catch (err) {
    console.error(`download-zip listResults [${caseId}]:`, err);
    return NextResponse.json({ error: "Błąd magazynu." }, { status: 502 });
  }
  if (!entries.length) {
    return NextResponse.json({ error: "Brak plików do spakowania." }, { status: 404 });
  }

  // Twardy limit jednej paczki: powyżej niego pobranie urwałoby się w połowie
  // (maxDuration). Klient dzieli wyniki na paczki mieszczące się w limicie —
  // to zabezpieczenie na wypadek wejścia na URL na piechotę albo listy plików,
  // które urosły od czasu wyświetlenia strony.
  const totalBytes = entries.reduce((sum, e) => sum + e.size, 0);
  if (totalBytes > PACKAGE_MAX_BYTES) {
    return NextResponse.json(
      {
        error: "Paczka jest za duża. Podziel wyniki na mniejsze paczki albo pobierz pliki pojedynczo.",
        totalBytes,
        limitBytes: PACKAGE_MAX_BYTES,
      },
      { status: 413 }
    );
  }

  // ?probe=1 — sam werdykt, bez pakowania. Kotwica <a download> nie widzi kodu
  // odpowiedzi, więc bez tego przeglądarka zapisałaby JSON z błędem (404/413)
  // jako plik „<caseId>.zip”. Klient pyta najpierw, potem dopiero pobiera.
  if (req.nextUrl.searchParams.get("probe")) {
    return NextResponse.json({ ok: true, count: entries.length, totalBytes });
  }

  const archive = archiver("zip", { store: true });
  const pass = new PassThrough();
  archive.on("warning", (err) => console.warn(`download-zip warn [${caseId}]:`, err?.message));
  // Błąd MUSI zerwać odpowiedź. Samo zalogowanie zostawiało klienta z otwartym,
  // nigdy niekończonym strumieniem — przeglądarka pokazywała ucięty plik dopiero
  // po timeoucie funkcji, bez informacji, że paczka jest niekompletna.
  archive.on("error", (err) => {
    console.error(`download-zip error [${caseId}]:`, err?.message);
    pass.destroy(err);
  });
  archive.pipe(pass);

  // Doklejaj pliki po kolei: pobierz strumień z magazynu i doczekaj końca wpisu,
  // zanim ruszy następny (jedno połączenie naraz, stała pamięć, backpressure).
  (async () => {
    try {
      for (const e of entries) {
        // Nieudany plik przerywa całość. Wcześniejsze `continue` po cichu wypuszczało
        // paczkę bez tego pliku — użytkownik dostawał ZIP wyglądający na kompletny.
        const url = await signedResultUrl(e.key, 900);
        const resp = await fetch(url);
        if (!resp.ok || !resp.body) {
          throw new Error(`nie pobrano ${e.name} (HTTP ${resp.status})`);
        }
        // Czekamy na domknięcie wpisu, ale nie w nieskończoność: błąd archiwum
        // (np. zerwany strumień źródłowy) kończy czekanie zamiast zawieszać
        // funkcję aż do maxDuration.
        const entryDone = new Promise<void>((res, rej) => {
          const onEntry = () => { archive.off("error", onError); res(); };
          const onError = (err: Error) => { archive.off("entry", onEntry); rej(err); };
          archive.once("entry", onEntry);
          archive.once("error", onError);
        });
        // Wpisy w katalogu o nazwie symulacji — po rozpakowaniu (także kilku
        // paczek naraz) pliki lądują w jednym folderze, a nie luzem obok siebie.
        archive.append(
          Readable.fromWeb(resp.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
          { name: `${caseId}/${e.name}` }
        );
        await entryDone;
      }
      await archive.finalize();
    } catch (err) {
      console.error(`download-zip stream [${caseId}]:`, err);
      archive.destroy(err as Error);
      pass.destroy(err as Error);
    }
  })();

  const webStream = Readable.toWeb(pass) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      "Cache-Control": "no-store",
    },
  });
}
