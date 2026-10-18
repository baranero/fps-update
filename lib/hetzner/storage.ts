import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, type _Object } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function s3() {
  return new S3Client({
    endpoint: process.env.HETZNER_STORAGE_ENDPOINT!,
    region: process.env.HETZNER_STORAGE_REGION ?? "eu-central-003",
    credentials: {
      accessKeyId: process.env.HETZNER_STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.HETZNER_STORAGE_SECRET_KEY!,
    },
    forcePathStyle: false,
  });
}

const BUCKET = () => process.env.HETZNER_STORAGE_BUCKET!;

// Lista WSZYSTKICH obiektów zlecenia. ListObjectsV2 oddaje najwyżej 1000 kluczy
// na stronę — model z kilkudziesięcioma siatkami i kilkoma przekrojami potrafi
// tę granicę przekroczyć, a wtedy nadmiarowe pliki znikały z listy wyników,
// z paczki ZIP i — co gorsze — ze sprzątania (zostawały w magazynie na zawsze).
export async function listResults(caseId: string, maxPages = 50) {
  const out: _Object[] = [];
  let token: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const res = await s3().send(
      new ListObjectsV2Command({ Bucket: BUCKET(), Prefix: `results/${caseId}/`, ContinuationToken: token })
    );
    out.push(...(res.Contents ?? []));
    if (!res.IsTruncated || !res.NextContinuationToken) break;
    token = res.NextContinuationToken;
  }
  return out;
}

/** Ścieżka obiektu względem katalogu zlecenia, np. „_preview/live/vis_1.png”. */
export function resultRelPath(caseId: string, key: string): string {
  const prefix = `results/${caseId}/`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key.split("/").pop() ?? key;
}

// Manifest migawki częściowych wyników — zapisywany przez maszynę liczącą przy
// każdym uploadzie w trakcie obliczeń: {"t": <czas symulacji>, "at": <ISO>}.
export const SNAPSHOT_MANIFEST = "_snapshot.json";

// Pliki służbowe (prefiks "_") nie są wynikiem dla użytkownika — nie pokazujemy
// ich na liście plików ani nie pakujemy do ZIP. Dotyczy KAŻDEGO segmentu ścieżki,
// bo ujęcia Smokeview leżą w podkatalogu `_preview/` — sama nazwa pliku
// („vis_1.png”) nie zdradza, że to plik służbowy.
export function isInternalResult(relPath: string): boolean {
  return relPath.split("/").some((seg) => seg.startsWith("_"));
}

/** Katalog ujęć Smokeview (podgląd na żywo + ryciny do raportu). */
export const PREVIEW_DIR = "_preview";
export const PREVIEW_MANIFEST = `${PREVIEW_DIR}/manifest.json`;

// Odczyt małego obiektu tekstowego (manifest migawki). null gdy brak/błąd.
export async function getResultText(key: string): Promise<string | null> {
  try {
    const r = await s3().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
    return (await r.Body?.transformToString()) ?? null;
  } catch {
    return null;
  }
}

// Domyślna ważność podpisanego odnośnika do pobrania: godzina. Odnośnik działa
// bez logowania — kto go ma, ten pobiera — więc wcześniejszy tydzień ważności
// oznaczał, że wyniki krążyły w mailach i zrzutach ekranu długo po tym, jak
// klient skończył pracę. Godzina pokrywa jedną sesję na karcie zlecenia; lista
// podpisuje się od nowa przy każdym wejściu w wyniki.
export const RESULT_URL_TTL_S = 3600;

export async function signedResultUrl(key: string, expiresIn = RESULT_URL_TTL_S) {
  // ResponseContentDisposition sprawia, że bezpośredni link (użyty w <a download>)
  // pobiera plik na dysk z właściwą nazwą — także cross-origin, bez pośrednictwa
  // serwera (istotne dla dużych plików FDS, gdzie proxy trafiałoby w limity funkcji).
  const filename = (key.split("/").pop() ?? "download").replace(/[^\x20-\x7E]/g, "_");
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn }
  );
}

/**
 * Podpisany adres do ZAPISU jednego obiektu. Maszyna licząca nie ma kluczy
 * magazynu — dostaje takie adresy z `/api/symulacje/[caseId]/upload-urls`,
 * wyłącznie dla kluczy pod własnym katalogiem (lib/hetzner/uploadKeys.ts).
 */
export async function signedUploadUrl(key: string, expiresIn = 900) {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: BUCKET(), Key: key }), { expiresIn });
}

export async function deleteResults(caseId: string) {
  const objects = await listResults(caseId);
  // DeleteObjects przyjmuje najwyżej 1000 kluczy na żądanie.
  for (let i = 0; i < objects.length; i += 1000) {
    const batch = objects.slice(i, i + 1000);
    await s3().send(new DeleteObjectsCommand({
      Bucket: BUCKET(),
      Delete: { Objects: batch.map((o) => ({ Key: o.Key! })) },
    }));
  }
}

export interface BucketUsage {
  bucket: string;
  objectCount: number;
  totalBytes: number;
  // Rozbicie po katalogu najwyższego poziomu (np. "results")
  prefixes: Array<{ prefix: string; objectCount: number; totalBytes: number }>;
  truncated: boolean; // true, gdy przerwaliśmy zliczanie po limicie stron
}

// Zlicza rozmiar i liczbę obiektów w całym buckecie (na żądanie, panel admina).
// Paginuje z twardym limitem stron, by nie zawiesić funkcji na ogromnym buckecie.
export async function bucketUsage(maxPages = 50): Promise<BucketUsage> {
  let token: string | undefined;
  let objectCount = 0;
  let totalBytes = 0;
  const byPrefix = new Map<string, { objectCount: number; totalBytes: number }>();
  let truncated = false;

  for (let page = 0; page < maxPages; page++) {
    const res = await s3().send(
      new ListObjectsV2Command({ Bucket: BUCKET(), ContinuationToken: token })
    );
    for (const o of res.Contents ?? []) {
      const size = o.Size ?? 0;
      objectCount++;
      totalBytes += size;
      const top = (o.Key ?? "").split("/")[0] || "(root)";
      const agg = byPrefix.get(top) ?? { objectCount: 0, totalBytes: 0 };
      agg.objectCount++;
      agg.totalBytes += size;
      byPrefix.set(top, agg);
    }
    if (res.IsTruncated && res.NextContinuationToken) {
      token = res.NextContinuationToken;
      if (page === maxPages - 1) truncated = true;
    } else {
      token = undefined;
      break;
    }
  }

  const prefixes = Array.from(byPrefix.entries())
    .map(([prefix, v]) => ({ prefix, ...v }))
    .sort((a, b) => b.totalBytes - a.totalBytes);

  return { bucket: BUCKET(), objectCount, totalBytes, prefixes, truncated };
}
