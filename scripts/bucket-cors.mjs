// Ustawia CORS na buckecie z wynikami (Hetzner Object Storage).
//
// Po co: zapis wyników wprost do folderu wskazanego przez użytkownika
// (File System Access API na stronie zlecenia) czyta pliki przez fetch na
// podpisany URL magazynu. To żądanie cross-origin — bez reguły CORS przeglądarka
// je zablokuje i strona cofnie się do klasycznych pobrań. Zwykłe pobieranie
// (kotwica <a download>) i paczki ZIP działają bez tego.
//
// Uruchomienie (Node 20.6+, wczytuje klucze z .env.local):
//   node --env-file=.env.local scripts/bucket-cors.mjs          — podgląd
//   node --env-file=.env.local scripts/bucket-cors.mjs --apply  — zapis
//
// Wymaga: HETZNER_STORAGE_ENDPOINT, _REGION, _ACCESS_KEY, _SECRET_KEY, _BUCKET.

import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const {
  HETZNER_STORAGE_ENDPOINT,
  HETZNER_STORAGE_REGION = "eu-central-003",
  HETZNER_STORAGE_ACCESS_KEY,
  HETZNER_STORAGE_SECRET_KEY,
  HETZNER_STORAGE_BUCKET,
} = process.env;

for (const [name, value] of Object.entries({
  HETZNER_STORAGE_ENDPOINT,
  HETZNER_STORAGE_ACCESS_KEY,
  HETZNER_STORAGE_SECRET_KEY,
  HETZNER_STORAGE_BUCKET,
})) {
  if (!value) {
    console.error(`Brak zmiennej ${name}. Uruchom z --env-file=.env.local.`);
    process.exit(1);
  }
}

// Skąd wolno czytać pliki. Podpisany URL i tak ogranicza dostęp — CORS tylko
// mówi przeglądarce, że odpowiedź może trafić do skryptu naszej strony.
const ORIGINS = [
  "https://fdsrun.com",
  "https://www.fdsrun.com",
  "https://fp-solutions.pl",
  "https://www.fp-solutions.pl",
  "https://*.vercel.app", // podglądy deploymentów
  "http://localhost:3000",
];

const RULES = [
  {
    AllowedOrigins: ORIGINS,
    AllowedMethods: ["GET", "HEAD"],
    AllowedHeaders: ["*"], // m.in. Range przy wznawianiu i podglądzie
    ExposeHeaders: ["Content-Length", "Content-Range", "Content-Disposition", "Accept-Ranges", "ETag"],
    MaxAgeSeconds: 3600,
  },
];

const s3 = new S3Client({
  endpoint: HETZNER_STORAGE_ENDPOINT,
  region: HETZNER_STORAGE_REGION,
  credentials: {
    accessKeyId: HETZNER_STORAGE_ACCESS_KEY,
    secretAccessKey: HETZNER_STORAGE_SECRET_KEY,
  },
  forcePathStyle: false,
});

const apply = process.argv.includes("--apply");

try {
  const current = await s3.send(new GetBucketCorsCommand({ Bucket: HETZNER_STORAGE_BUCKET }));
  console.log("Obecna konfiguracja CORS:");
  console.dir(current.CORSRules, { depth: null });
} catch (err) {
  if (err?.name === "NoSuchCORSConfiguration") console.log("Bucket nie ma jeszcze konfiguracji CORS.");
  else throw err;
}

if (!apply) {
  console.log("\nDo zapisania (dopisz --apply, żeby wysłać):");
  console.dir(RULES, { depth: null });
  process.exit(0);
}

// PutBucketCors NADPISUJE całą konfigurację — reguły spoza tego pliku przepadną.
await s3.send(new PutBucketCorsCommand({
  Bucket: HETZNER_STORAGE_BUCKET,
  CORSConfiguration: { CORSRules: RULES },
}));
console.log(`\nZapisano CORS na buckecie ${HETZNER_STORAGE_BUCKET}.`);
