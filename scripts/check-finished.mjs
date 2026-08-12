// ─── Które zlecenia faktycznie się skończyły ─────────────────────────────────
//
// Status w bazie bywa nieaktualny: gdy webhook kończący nie dojdzie (awaria,
// zerwana sieć), zlecenie zostaje w "running" na zawsze. Rozstrzygamy więc na
// dowodach, których nic po drodze nie gubi:
//   • czy maszyna jeszcze istnieje w Hetznerze,
//   • co FDS zapisał na końcu pliku CHID.out w magazynie.
//
// FDS kończy bieg linią "STOP: ..." — sukcesem, zatrzymaniem przez użytkownika
// (nasz łagodny stop) albo niestabilnością numeryczną. Czytamy tylko ogon pliku
// zakresem bajtów, więc sprawdzenie jest tanie niezależnie od rozmiaru wyników.

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

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

// Zlecenia do sprawdzenia: domyślnie te, które baza uważa za trwające.
const status = process.argv[2] ?? "running";
const { data: rows, error } = await supabase
  .from("fds_submissions")
  .select("case_id, status, file_name, started_at, t_end")
  .eq("status", status)
  .order("started_at");
if (error) { console.error("Baza:", error.message); process.exit(1); }

// Które maszyny jeszcze żyją.
const hz = await fetch("https://api.hetzner.cloud/v1/servers?per_page=50", {
  headers: { Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}` },
});
const alive = new Set(
  (await hz.json()).servers.filter((s) => s.name.startsWith("fds-"))
    .map((s) => s.name.replace(/^fds-/, "").toUpperCase())
);

// Ogon pliku CHID.out — tam FDS zapisuje ostatnie słowo.
async function fdsVerdict(caseId) {
  const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `results/${caseId}/` }));
  const out = (list.Contents ?? [])
    .filter((o) => o.Key.endsWith(".out") && !o.Key.split("/").pop().startsWith("_"))
    .sort((a, b) => (b.Size ?? 0) - (a.Size ?? 0))[0];
  if (!out) return { verdict: "brak pliku .out", t: null };

  const size = out.Size ?? 0;
  const from = Math.max(0, size - TAIL_BYTES);
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: out.Key, Range: `bytes=${from}-` }));
  const tail = await r.Body.transformToString();

  const stop = tail.match(/STOP:.*/g);
  const times = Array.from(tail.matchAll(/Simulation Time:\s*([\d.E+-]+)\s*s/g));
  const t = times.length ? parseFloat(times[times.length - 1][1]) : null;
  return {
    verdict: stop ? stop[stop.length - 1].trim() : "brak linii STOP (nadal liczy albo urwane)",
    t,
    at: out.LastModified,
    file: out.Key.split("/").pop(),
  };
}

console.log(`Sprawdzam ${rows.length} zleceń ze statusem "${status}".\n`);
const done = [], running = [], unclear = [];

for (const row of rows) {
  const v = await fdsVerdict(row.case_id);
  const machine = alive.has(row.case_id);
  const finished = /STOP:/.test(v.verdict);
  (finished ? done : machine ? running : unclear).push({ ...row, ...v, machine });
  console.log(
    `${row.case_id.padEnd(22)} maszyna: ${(machine ? "żyje" : "brak").padEnd(5)}  ` +
    `T=${(v.t ?? "—").toString().padStart(9)} / ${row.t_end} s   ${v.verdict.slice(0, 60)}`
  );
}

const show = (title, list) => {
  if (!list.length) return;
  console.log(`\n${title} (${list.length}):`);
  for (const j of list) {
    console.log(`  • ${j.case_id}  ${j.file_name}  ${j.t != null ? `T=${j.t} s` : ""}  ${j.at ? `ostatni zapis ${j.at.toISOString().slice(0, 16).replace("T", " ")}` : ""}`);
  }
};

show("ZAKOŃCZONE — FDS dobiegł końca, a baza wciąż pokazuje 'w toku'", done);
show("LICZĄ SIĘ — maszyna żyje, brak linii STOP", running);
show("NIEJASNE — maszyny nie ma, a FDS nie zapisał STOP (przerwane)", unclear);
