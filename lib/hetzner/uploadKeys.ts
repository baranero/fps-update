// ─── Nazwy obiektów, które maszyna może zapisać w magazynie ──────────────────
//
// Maszyna nie ma kluczy magazynu: prosi serwis o podpisane adresy PUT dla
// konkretnych nazw, a serwis podpisuje wyłącznie klucze pod `results/<case>/`.
// Ta funkcja decyduje, które nazwy przyjmujemy — bez niej maszyna (lub ktoś
// z jej tokenem) mogłaby poprosić o podpis dla cudzego katalogu.

/** Najwięcej nazw w jednym żądaniu — migawka dużego modelu to setki plików. */
export const MAX_UPLOAD_KEYS = 1000;
const MAX_SEGMENTS = 4;
const MAX_LENGTH = 512;
// Segment: znaki, jakie FDS i Smokeview realnie zapisują w nazwach (CHID może
// zawierać np. „+” albo nawiasy); bez spacji, ukośników i kropki na początku.
const SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._+()@=,-]{0,254}$/;

/** Ścieżka względna wobec katalogu zlecenia albo null, gdy niedopuszczalna. */
export function safeResultRelPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!raw || raw.length > MAX_LENGTH) return null;
  const segments = raw.split("/");
  if (segments.length > MAX_SEGMENTS) return null;
  for (const seg of segments) {
    if (!SEGMENT.test(seg) || seg === "..") return null;
  }
  return segments.join("/");
}

/** Klucz w magazynie dla pliku zlecenia; null, gdy nazwa jest niedopuszczalna. */
export function resultObjectKey(caseId: string, rel: unknown): string | null {
  const safe = safeResultRelPath(rel);
  if (!safe) return null;
  if (!/^[A-Z0-9-]{6,64}$/i.test(caseId)) return null;
  return `results/${caseId}/${safe}`;
}
