// Weryfikacja CORS na buckecie wyników: podpisuje URL do realnego obiektu,
// robi preflight i żądanie z nagłówkiem Range — dokładnie tak, jak zrobi to
// przeglądarka przy zapisie do folderu i przy podglądzie przekroju .sf.
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  HETZNER_STORAGE_ENDPOINT, HETZNER_STORAGE_REGION = "eu-central-003",
  HETZNER_STORAGE_ACCESS_KEY, HETZNER_STORAGE_SECRET_KEY, HETZNER_STORAGE_BUCKET,
} = process.env;

const s3 = new S3Client({
  endpoint: HETZNER_STORAGE_ENDPOINT,
  region: HETZNER_STORAGE_REGION,
  credentials: { accessKeyId: HETZNER_STORAGE_ACCESS_KEY, secretAccessKey: HETZNER_STORAGE_SECRET_KEY },
  forcePathStyle: false,
});

// Origin do sprawdzenia — domyślnie produkcyjny. Przy pracy lokalnej podaj swój,
// np. `node scripts/verify-storage-cors.mjs http://localhost:3001`, bo reguła
// obejmuje tylko adresy wymienione w scripts/bucket-cors.mjs.
const ORIGIN = process.argv[2] ?? "https://fdsrun.com";

const list = await s3.send(new ListObjectsV2Command({
  Bucket: HETZNER_STORAGE_BUCKET, Prefix: "results/", MaxKeys: 5,
}));
const obj = (list.Contents ?? []).find((o) => (o.Size ?? 0) > 0);
if (!obj) {
  console.log("Brak obiektów w results/ — nie ma na czym sprawdzić. Uruchom po pierwszym zleceniu.");
  process.exit(0);
}
console.log("Obiekt testowy:", obj.Key, `(${obj.Size} B)`);

const url = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: HETZNER_STORAGE_BUCKET, Key: obj.Key }),
  { expiresIn: 120 }
);

const show = (label, res, keys) => {
  console.log(`\n${label} → HTTP ${res.status}`);
  for (const k of keys) {
    const v = res.headers.get(k);
    console.log(`  ${k}: ${v ?? "(brak)"}`);
  }
};

const pre = await fetch(url, {
  method: "OPTIONS",
  headers: {
    Origin: ORIGIN,
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "range",
  },
});
show("PREFLIGHT (OPTIONS)", pre, [
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-max-age",
]);

const get = await fetch(url, { headers: { Origin: ORIGIN, Range: "bytes=0-0" } });
show("GET z Range: bytes=0-0", get, [
  "access-control-allow-origin",
  "access-control-expose-headers",
  "content-range",
  "accept-ranges",
]);

const ok =
  pre.headers.get("access-control-allow-origin") &&
  get.headers.get("access-control-allow-origin") &&
  (get.headers.get("access-control-expose-headers") ?? "").toLowerCase().includes("content-range");

console.log(`\n${ok ? "OK — przeglądarka pobierze pliki wprost z magazynu." : "NIEGOTOWE — czegoś brakuje, patrz wyżej."}`);
