import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
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

export async function listResults(caseId: string) {
  const res = await s3().send(
    new ListObjectsV2Command({ Bucket: BUCKET(), Prefix: `results/${caseId}/` })
  );
  return res.Contents ?? [];
}

// Manifest migawki częściowych wyników — zapisywany przez maszynę liczącą przy
// każdym uploadzie w trakcie obliczeń: {"t": <czas symulacji>, "at": <ISO>}.
export const SNAPSHOT_MANIFEST = "_snapshot.json";

// Pliki służbowe (prefiks "_") nie są wynikiem dla użytkownika — nie pokazujemy
// ich na liście plików ani nie pakujemy do ZIP.
export function isInternalResult(name: string): boolean {
  return name.startsWith("_");
}

// Odczyt małego obiektu tekstowego (manifest migawki). null gdy brak/błąd.
export async function getResultText(key: string): Promise<string | null> {
  try {
    const r = await s3().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
    return (await r.Body?.transformToString()) ?? null;
  } catch {
    return null;
  }
}

export async function signedResultUrl(key: string, expiresIn = 604800) {
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

export async function deleteResults(caseId: string) {
  const objects = await listResults(caseId);
  if (!objects.length) return;
  await s3().send(new DeleteObjectsCommand({
    Bucket: BUCKET(),
    Delete: { Objects: objects.map((o) => ({ Key: o.Key! })) },
  }));
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
