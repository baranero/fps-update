export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { signedResultUrl } from "@/lib/hetzner/storage";

// Dostęp do plików wynikowych.
//
// DOMYŚLNIE oddaje przekierowanie do magazynu — bajty lecą wprost z Hetznera do
// przeglądarki, z pominięciem naszych funkcji. Wcześniej ten route strumieniował
// każdy plik przez siebie, więc ten sam bajt płaciliśmy dwa razy (transfer z
// funkcji na brzeg sieci + z brzegu do klienta). Przy wynikach FDS liczonych w
// gigabajtach była to najdroższa pozycja rachunku hostingu.
//
// Nazwę pliku i wymuszenie zapisu na dysk niesie sam podpis
// (ResponseContentDisposition w `lib/hetzner/storage.ts`), więc przekierowanie
// niczego nie psuje — także dla nazw z polskimi znakami.
//
// `?proxy=1` zostawia dawne zachowanie (strumień przez nasz origin). Potrzebne
// wyłącznie jako zejście awaryjne dla żądań `fetch`, gdyby magazyn stracił
// konfigurację CORS (`scripts/bucket-cors.mjs`) — wtedy przeglądarka nie
// odczyta odpowiedzi wprost z magazynu. Ta ścieżka ma twardy limit rozmiaru,
// żeby nigdy znowu nie stała się kurkiem na gigabajty.
const PROXY_MAX_BYTES = 256 * 1024 * 1024;

export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;
  const raw = req.nextUrl.searchParams.get("file") ?? "";
  // Tylko sama nazwa pliku — zero path traversal
  const base = raw.split("/").pop()?.split("\\").pop() ?? "";
  if (!base || base.includes("..")) {
    return NextResponse.json({ error: "Zła nazwa pliku." }, { status: 400 });
  }

  const key = `results/${caseId}/${base}`;
  try {
    const url = await signedResultUrl(key, 300);

    // Podpis jest jednorazowy i krótkoterminowy, więc przekierowanie nie może
    // trafić do żadnego cache'u po drodze.
    const redirect = () => {
      const res = NextResponse.redirect(url, 302);
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    };

    if (!req.nextUrl.searchParams.get("proxy")) return redirect();

    // Przekaż nagłówek Range dalej — pozwala klientowi tanio sprawdzić rozmiar
    // (Range: bytes=0-0 → Content-Range z całkowitym rozmiarem) przed pobraniem
    // całości do animacji.
    const range = req.headers.get("range");
    const upstream = await fetch(url, range ? { headers: { Range: range } } : undefined);
    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });
    }

    // Duży plik nigdy nie przechodzi przez funkcję, nawet gdy ktoś o to poprosi.
    // Przeglądarka bez CORS i tak nie odczyta odpowiedzi z magazynu, ale to
    // świadomy wybór: utrata jednej funkcji podglądu zamiast rachunku za ruch.
    const len = Number(upstream.headers.get("content-length") ?? 0);
    if (!range && len > PROXY_MAX_BYTES) {
      console.warn(`download proxy [${caseId}/${base}]: ${len} B > limit, przekierowuję`);
      upstream.body.cancel().catch(() => { /* strumień i tak porzucamy */ });
      return redirect();
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    headers.set("Accept-Ranges", "bytes");
    if (len) headers.set("Content-Length", String(len));
    const cr = upstream.headers.get("content-range");
    if (cr) headers.set("Content-Range", cr);
    // filename oraz filename* (RFC 5987) — poprawne polskie znaki w nazwie
    headers.set(
      "Content-Disposition",
      `attachment; filename="${base.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(base)}`
    );
    headers.set("Cache-Control", "private, max-age=0, no-store");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error(`download [${caseId}/${base}]:`, err);
    return NextResponse.json({ error: "Błąd pobierania pliku." }, { status: 500 });
  }
}
