export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { signedResultUrl } from "@/lib/hetzner/storage";

// Proxy pobierania plików wynikowych. Przeglądarka pobiera z NASZEGO origin, a
// serwer po stronie backendu ciągnie plik z Hetzner Object Storage — dzięki temu
// omijamy CORS magazynu, który blokuje bezpośredni fetch podpisanych URL-i
// (potrzebny przy pakowaniu wielu plików do ZIP). Strumieniujemy bez buforowania.
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
    const range = req.headers.get("range");

    // Pełne pobranie (bez Range) → 302 na podpisany URL: bajty lecą wprost
    // klient↔Hetzner, przez nasz origin nie przechodzi ani bajt (to eliminuje
    // Fast Origin Transfer na Vercelu — główny sprawca przekroczenia limitu).
    // Podpis już niesie ResponseContentDisposition=attachment z nazwą pliku.
    // Zapytania z Range (tania sonda rozmiaru bytes=0-0 lub animacja czytana
    // przez JS) MUSZĄ zostać proxowane — bezpośredni fetch z JS blokuje CORS bucketu.
    if (!range) {
      return NextResponse.redirect(url, 302);
    }

    const upstream = await fetch(url, { headers: { Range: range } });
    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    headers.set("Accept-Ranges", "bytes");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
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
    console.error(`download proxy [${caseId}/${base}]:`, err);
    return NextResponse.json({ error: "Błąd pobierania pliku." }, { status: 500 });
  }
}
