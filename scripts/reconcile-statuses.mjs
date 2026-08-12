// ─── Uzgodnienie statusów zleceń ze stanem faktycznym ────────────────────────
//
// Status w bazie ustawia webhook z maszyny liczącej. Gdy webhook nie dojdzie
// (awaria bazy, zerwana sieć, ubita maszyna), zlecenie zostaje w "running" na
// zawsze — mimo że FDS dawno skończył. Ten skrypt odtwarza prawdę z dwóch
// źródeł, których to nie dotyczy:
//
//   • Hetzner Cloud API — czy maszyna jeszcze istnieje,
//   • plik CHID.out w magazynie — FDS kończy bieg linią "STOP: ...".
//
// Reguły:
//   maszyna żyje                        → zostaw "running", nic nie zgadujemy
//   STOP: ...completed successfully     → "done"
//   STOP: ...(inne, np. niestabilność)  → "failed"
//   brak maszyny i brak STOP            → "failed" (przerwane w połowie)
//
// Uruchomienie:
//   node --env-file=.env.local scripts/reconcile-statuses.mjs           — podgląd
//   node --env-file=.env.local scripts/reconcile-statuses.mjs --apply   — zapis

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const TAIL_BYTES = 8192;

const s3 = new S3Client({
  endpoint: process.env.HETZNER_STORAGE_ENDPOINT,
  region: process.env.HETZNER_STORAGE_REGION ?? "eu-central-003",
  credentials: {
    accessKeyId: process.env.HETZNER_STORAGE_ACCESS_KEY,
    secretAccessKey: process.env.HETZNER_STORAGE_SECRET_KEY,
  },
  forcePathStyle: false,
});
const BUCKET = process.env.HETZNER_STORAGE_BUCKET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: rows, error } = await supabase
  .from("fds_submissions")
  .select("case_id, status, file_name, started_at, dispatched_at, server_id")
  .in("status", ["running", "dispatched"])
  .order("started_at");
if (error) { console.error("Baza:", error.message); process.exit(1); }

const hz = await fetch("https://api.hetzner.cloud/v1/servers?per_page=50", {
  headers: { Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}` },
});
const alive = new Set(
  (await hz.json()).servers.filter((s) => s.name.startsWith("fds-"))
    .map((s) => s.name.replace(/^fds-/, "").toUpperCase())
);

// Ostatnie słowo FDS + kiedy magazyn dostał ostatni plik (to jest realny czas
// zakończenia: maszyna wgrywa komplet wyników tuż przed samousunięciem).
async function evidence(caseId) {
  const files = [];
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: `results/${caseId}/`, ContinuationToken: token,
    }));
    files.push(...(page.Contents ?? []));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  if (!files.length) return { stop: null, lastWrite: null, files: 0 };

  const lastWrite = new Date(Math.max(...files.map((f) => +f.LastModified)));
  const out = files
    .filter((o) => o.Key.endsWith(".out") && !o.Key.split("/").pop().startsWith("_"))
    .sort((a, b) => (b.Size ?? 0) - (a.Size ?? 0))[0];
  if (!out) return { stop: null, lastWrite, files: files.length };

  const from = Math.max(0, (out.Size ?? 0) - TAIL_BYTES);
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: out.Key, Range: `bytes=${from}-` }));
  const tail = await r.Body.transformToString();
  const stop = (tail.match(/STOP:.*/g) ?? []).pop()?.trim() ?? null;
  return { stop, lastWrite, files: files.length };
}

const plan = [];
for (const row of rows) {
  const machine = alive.has(row.case_id);
  const ev = await evidence(row.case_id);

  let next = null;
  let why = "";
  if (machine) {
    why = "maszyna żyje — bez zmian";
  } else if (ev.stop && /completed successfully/i.test(ev.stop)) {
    next = "done";
    why = ev.stop;
  } else if (ev.stop) {
    next = "failed";
    why = ev.stop;
  } else {
    next = "failed";
    why = ev.files ? "brak maszyny, FDS nie zapisał STOP — przerwane" : "brak maszyny i brak wyników";
  }

  plan.push({ ...row, machine, next, why, lastWrite: ev.lastWrite, files: ev.files });
  console.log(
    `${row.case_id.padEnd(22)} ${row.status.padEnd(10)} → ${(next ?? row.status).padEnd(8)} ` +
    `${row.file_name.padEnd(22)} ${why.slice(0, 52)}`
  );
}

const changes = plan.filter((p) => p.next && p.next !== p.status);
console.log(`\nDo zmiany: ${changes.length} z ${plan.length}`);
if (!changes.length) process.exit(0);

if (!APPLY) {
  console.log("Podgląd — dopisz --apply, żeby zapisać.");
  process.exit(0);
}

for (const c of changes) {
  // completed_at bierzemy z ostatniego zapisu do magazynu — to najbliższy
  // prawdzie moment zakończenia pracy maszyny.
  const { error: err } = await supabase
    .from("fds_submissions")
    .update({ status: c.next, completed_at: (c.lastWrite ?? new Date()).toISOString() })
    .eq("case_id", c.case_id);
  console.log(err ? `  BŁĄD ${c.case_id}: ${err.message}` : `  zapisano ${c.case_id} → ${c.next}`);
}
