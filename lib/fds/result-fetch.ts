// ─── Pobieranie plików wynikowych po stronie przeglądarki ────────────────────
//
// Zasada: bajty wyników NIE przechodzą przez nasze funkcje. Plik idzie wprost
// z magazynu do przeglądarki po podpisanym URL-u. Przepuszczanie go przez własny
// origin kosztowało podwójnie — raz jako transfer z funkcji na brzeg sieci, raz
// jako transfer z brzegu do klienta — a wyniki FDS liczy się w gigabajtach.
//
// Proxy zostaje wyłącznie jako zejście awaryjne: gdyby magazyn stracił
// konfigurację CORS (patrz `scripts/bucket-cors.mjs`), przeglądarka odrzuci
// bezpośredni fetch i wtedy lepiej zapłacić za transfer, niż pokazać błąd.
// Ta ścieżka ma po stronie route'a twardy limit rozmiaru.

/** Adres do nawigacji (kotwica `<a download>`) — route oddaje przekierowanie. */
export function resultHref(caseId: string, name: string): string {
  return `/api/symulacje/${caseId}/download?file=${encodeURIComponent(name)}`;
}

/** Adres dla `fetch` — wymusza strumień przez nasz origin (tylko awaryjnie). */
export function proxyResultUrl(caseId: string, name: string): string {
  return `${resultHref(caseId, name)}&proxy=1`;
}

/**
 * Pobiera plik wynikowy: najpierw wprost z magazynu, a gdy to się nie uda —
 * przez własny origin. `direct` bywa puste, gdy pliku nie ma jeszcze na liście
 * wyników (podpisy powstają przy jej odświeżaniu).
 */
export async function fetchResult(
  direct: string | undefined,
  proxy: string,
  init?: RequestInit
): Promise<Response> {
  if (direct) {
    try {
      const res = await fetch(direct, init);
      // 206 przy żądaniu z nagłówkiem Range — dla nas równie dobre jak 200.
      if (res.ok || res.status === 206) return res;
    } catch {
      // Najczęściej brak CORS albo zerwana sieć — schodzimy na proxy.
    }
  }
  return fetch(proxy, init);
}
