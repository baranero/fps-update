/**
 * Ustawia politykę CORS na kubełku Hetzner Object Storage, tak aby przeglądarka
 * mogła pobierać pliki wynikowe bezpośrednio (fetch → blob → ZIP, doczytywanie CSV,
 * animacja .sf). Bez tego magazyn nie zwraca Access-Control-Allow-Origin i przeglądarka
 * blokuje żądania (błąd "blocked by CORS policy").
 *
 * URUCHOMIENIE (jednorazowo):
 *   1) Upewnij się, że dostępne są zmienne środowiskowe magazynu — skrypt sam
 *      wczyta .env.local / .env z katalogu projektu, jeśli tam są:
 *        HETZNER_STORAGE_ENDPOINT, HETZNER_STORAGE_REGION,
 *        HETZNER_STORAGE_ACCESS_KEY, HETZNER_STORAGE_SECRET_KEY, HETZNER_STORAGE_BUCKET
 *   2) node scripts/set-storage-cors.cjs
 *
 * Dozwolone originy można nadpisać: CORS_ORIGINS="https://a.pl,https://b.pl" node scripts/...
 */

const fs = require("fs");
const path = require("path");
const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require("@aws-sdk/client-s3");

// Minimalny loader .env (bez zależności) — ustawia tylko brakujące zmienne
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const {
  HETZNER_STORAGE_ENDPOINT,
  HETZNER_STORAGE_REGION = "eu-central-003",
  HETZNER_STORAGE_ACCESS_KEY,
  HETZNER_STORAGE_SECRET_KEY,
  HETZNER_STORAGE_BUCKET,
} = process.env;

const missing = [
  ["HETZNER_STORAGE_ENDPOINT", HETZNER_STORAGE_ENDPOINT],
  ["HETZNER_STORAGE_ACCESS_KEY", HETZNER_STORAGE_ACCESS_KEY],
  ["HETZNER_STORAGE_SECRET_KEY", HETZNER_STORAGE_SECRET_KEY],
  ["HETZNER_STORAGE_BUCKET", HETZNER_STORAGE_BUCKET],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.error("Brak zmiennych środowiskowych:", missing.join(", "));
  console.error("Ustaw je (np. w .env.local) i uruchom ponownie.");
  process.exit(1);
}

const origins = (process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [
      "https://fp-solutions.pl",
      "https://www.fp-solutions.pl",
      "http://localhost:3000",
    ]);

const s3 = new S3Client({
  endpoint: HETZNER_STORAGE_ENDPOINT,
  region: HETZNER_STORAGE_REGION,
  credentials: { accessKeyId: HETZNER_STORAGE_ACCESS_KEY, secretAccessKey: HETZNER_STORAGE_SECRET_KEY },
  forcePathStyle: false,
});

const CORSConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: origins,
      AllowedMethods: ["GET", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["Content-Length", "Content-Range", "Content-Disposition", "Accept-Ranges", "ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

(async () => {
  try {
    console.log("Kubełek:", HETZNER_STORAGE_BUCKET, "@", HETZNER_STORAGE_ENDPOINT);
    console.log("Dozwolone originy:", origins.join(", "));
    await s3.send(new PutBucketCorsCommand({ Bucket: HETZNER_STORAGE_BUCKET, CORSConfiguration }));
    console.log("✓ Polityka CORS ustawiona.");
    const check = await s3.send(new GetBucketCorsCommand({ Bucket: HETZNER_STORAGE_BUCKET }));
    console.log("Odczyt zwrotny CORSRules:");
    console.log(JSON.stringify(check.CORSRules, null, 2));
  } catch (err) {
    console.error("Błąd ustawiania CORS:", err && err.message ? err.message : err);
    process.exit(1);
  }
})();
