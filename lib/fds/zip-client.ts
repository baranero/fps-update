// ─── Pakowanie wyników do ZIP po stronie przeglądarki ────────────────────────
//
// Archiwum powstaje na komputerze użytkownika: pliki lecą wprost z magazynu,
// przechodzą przez pakowarkę i idą strumieniem na dysk. Nasze funkcje nie widzą
// ani jednego bajta wyników, więc paczka nie kosztuje transferu i nie ma nic
// wspólnego z limitem czasu funkcji — a to właśnie ZIP był ostatnią ścieżką,
// którą wyniki przechodziły przez hosting.
//
// Warunki: przeglądarka musi umieć zapis strumieniowy na dysk
// (`showSaveFilePicker`, dziś Chrome/Edge) — inaczej całe archiwum musiałoby
// zmieścić się w pamięci, co przy paczce liczonej w gigabajtach nie przejdzie.
// Bez tego API strona wraca do paczki składanej na serwerze.

import { makeZip } from "client-zip";
import { fetchResult, proxyResultUrl } from "./result-fetch";

export interface ZipSourceFile {
  name: string;
  /** Podpisany adres w magazynie; brak = pobranie przez własny origin. */
  url?: string;
  size: number | null;
}

/** Uchwyt pliku z File System Access API — minimalny kontrakt, którego używamy. */
export interface WritableFileHandle {
  createWritable(): Promise<WritableStream<Uint8Array>>;
}

type SaveFilePicker = (opts?: {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<WritableFileHandle>;

/**
 * Okno „zapisz jako", jeśli przeglądarka je ma. Wywołanie MUSI nastąpić w
 * geście użytkownika — przed jakimkolwiek `await`, inaczej przeglądarka je odrzuci.
 */
export function saveFilePicker(): SaveFilePicker | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { showSaveFilePicker?: SaveFilePicker };
  return typeof w.showSaveFilePicker === "function" ? w.showSaveFilePicker.bind(window) : null;
}

// Pliki pobierane po kolei, dopiero gdy pakowarka po nie sięgnie. Dzięki temu w
// locie jest jedno połączenie, a pamięć nie rośnie z rozmiarem paczki.
async function* zipEntries(
  caseId: string,
  files: ZipSourceFile[],
  onProgress?: (i: number, n: number, name: string) => void
) {
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.(i + 1, files.length, f.name);
    const res = await fetchResult(f.url, proxyResultUrl(caseId, f.name));
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} (${f.name})`);
    // Wpisy w katalogu o nazwie zlecenia — po rozpakowaniu (także kilku paczek
    // naraz) pliki lądują w jednym folderze, a nie luzem obok siebie.
    yield {
      input: res,
      name: `${caseId}/${f.name}`,
      size: f.size ?? undefined,
    };
  }
}

/**
 * Pakuje `files` do archiwum i zapisuje je przez podany uchwyt pliku.
 * Rzuca, gdy któregoś pliku nie da się pobrać albo zapis się nie powiedzie —
 * `pipeTo` przerywa wtedy zapis, więc na dysku nie zostaje kompletnie wyglądające
 * archiwum bez części plików.
 */
export async function streamZipToFile(opts: {
  caseId: string;
  files: ZipSourceFile[];
  handle: WritableFileHandle;
  onProgress?: (i: number, n: number, name: string) => void;
}): Promise<void> {
  const writable = await opts.handle.createWritable();
  await makeZip(zipEntries(opts.caseId, opts.files, opts.onProgress)).pipeTo(writable);
}
