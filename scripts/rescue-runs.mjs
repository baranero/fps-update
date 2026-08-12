// ─── Dostęp do trwających obliczeń z pominięciem bazy ────────────────────────
//
// Gdy Postgres nie odpowiada, aplikacja nie pokaże ani jednego zlecenia — cała
// strona zlecenia czyta z bazy. Obliczenia jednak trwają: maszyna liczy, a
// migawki wyników lądują w magazynie co ~2 minuty (upload przez aws-cli nie ma
// nic wspólnego z bazą, a nieudane webhooki są ignorowane przez `|| true`).
//
// Ten skrypt składa obraz zlecenia z dwóch źródeł, których awaria nie dotyczy:
//   • Hetzner Cloud API — które maszyny żyją, od kiedy i ile kosztują,
//   • magazyn wyników  — jak daleko doszła symulacja (_snapshot.json) i co
//     już można pobrać.
//
// Na koniec zapisuje stronę HTML z podpisanymi linkami do pobrania — działa bez
// aplikacji i bez bazy. Linki wygasają po 7 dniach.
//
// Uruchomienie:  node --env-file=.env.local scripts/rescue-runs.mjs [plik.html]

import { writeFileSync } from "node:fs";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const OUT = process.argv[2] ?? "rescue-symulacje.html";
const BUCKET = process.env.HETZNER_STORAGE_BUCKET;

const s3 = new S3Client({
  endpoint: process.env.HETZNER_STORAGE_ENDPOINT,
  region: process.env.HETZNER_STORAGE_REGION ?? "eu-central-003",
  credentials: {
    accessKeyId: process.env.HETZNER_STORAGE_ACCESS_KEY,
    secretAccessKey: process.env.HETZNER_STORAGE_SECRET_KEY,
  },
  forcePathStyle: false,
});

const hetzner = async (path) => {
  const r = await fetch(`https://api.hetzner.cloud/v1${path}`, {
    headers: { Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Hetzner API ${r.status}: ${await r.text()}`);
  return r.json();
};

const fmtSize = (b) =>
  b >= 1 << 30 ? `${(b / (1 << 30)).toFixed(2)} GB` : b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
const fmtAge = (d) => {
  const m = (Date.now() - d.getTime()) / 60000;
  return m < 60 ? `${m.toFixed(0)} min` : `${(m / 60).toFixed(1)} h`;
};

// ── 1. Maszyny liczące ───────────────────────────────────────────────────────
const { servers } = await hetzner("/servers?per_page=50");
const fdsServers = servers.filter((s) => s.name.startsWith("fds-"));
console.log(`Maszyn FDS w Hetznerze: ${fdsServers.length}`);

// Nazwa serwera powstaje z caseId (małe litery), więc odwracamy przez wielkie litery.
const jobs = fdsServers.map((s) => ({
  caseId: s.name.replace(/^fds-/, "").toUpperCase(),
  server: { id: s.id, status: s.status, created: new Date(s.created), type: s.server_type?.name, ip: s.public_net?.ipv4?.ip },
}));

// ── 2. Co leży w magazynie ───────────────────────────────────────────────────
for (const j of jobs) {
  j.files = [];
  j.snapshot = null;
  try {
    let token;
    do {
      const page = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET, Prefix: `results/${j.caseId}/`, ContinuationToken: token,
      }));
      for (const o of page.Contents ?? []) {
        j.files.push({ key: o.Key, name: o.Key.split("/").pop(), size: o.Size ?? 0, at: o.LastModified });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  } catch (err) {
    j.error = String(err.message ?? err);
  }

  const man = j.files.find((f) => f.name === "_snapshot.json");
  if (man) {
    try {
      const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: man.key }));
      j.snapshot = JSON.parse(await r.Body.transformToString());
    } catch { /* uszkodzony manifest — pomijamy */ }
  }
  j.visible = j.files.filter((f) => !f.name.startsWith("_"));
  j.bytes = j.visible.reduce((a, f) => a + f.size, 0);
  j.lastUpload = j.files.length ? new Date(Math.max(...j.files.map((f) => +f.at))) : null;
}

// ── 3. Podsumowanie w konsoli ────────────────────────────────────────────────
console.log("\nzlecenie                maszyna    działa    T sym.   plików    rozmiar   ost. migawka");
for (const j of jobs.sort((a, b) => +a.server.created - +b.server.created)) {
  console.log(
    `${j.caseId.padEnd(22)} ${String(j.server.status).padEnd(10)} ${fmtAge(j.server.created).padStart(7)} ` +
    `${(j.snapshot?.t != null ? `${j.snapshot.t} s` : "—").padStart(9)} ${String(j.visible.length).padStart(7)} ` +
    `${fmtSize(j.bytes).padStart(10)}   ${j.lastUpload ? fmtAge(j.lastUpload) + " temu" : "brak"}`
  );
}

// ── 4. Strona z linkami ──────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sections = [];
for (const j of jobs) {
  const rows = [];
  for (const f of j.visible.sort((a, b) => a.name.localeCompare(b.name))) {
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: f.key }), { expiresIn: 604800 });
    rows.push(`<tr><td><a href="${esc(url)}">${esc(f.name)}</a></td><td class="n">${fmtSize(f.size)}</td><td class="n">${f.at.toISOString().replace("T", " ").slice(0, 16)}</td></tr>`);
  }
  sections.push(`<section><h2>${esc(j.caseId)}</h2>
<p class="meta">maszyna <b>${esc(j.server.status)}</b> (${esc(j.server.type ?? "—")}) · działa ${fmtAge(j.server.created)} ·
czas symulacji ${j.snapshot?.t != null ? `<b>${j.snapshot.t} s</b>` : "nieznany"} ·
ostatnia migawka ${j.lastUpload ? fmtAge(j.lastUpload) + " temu" : "brak"} · ${j.visible.length} plików, ${fmtSize(j.bytes)}</p>
${rows.length ? `<table><thead><tr><th>plik</th><th class="n">rozmiar</th><th class="n">zapisany</th></tr></thead><tbody>${rows.join("")}</tbody></table>` : "<p class=\"meta\">Brak plików w magazynie — maszyna jeszcze nic nie wysłała.</p>"}
</section>`);
}

writeFileSync(OUT, `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<title>Wyniki symulacji — dostęp awaryjny</title><style>
:root{color-scheme:light dark}
body{font:15px/1.6 system-ui,Segoe UI,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem}
h1{font-size:1.5rem;margin-bottom:.25rem} h2{font-size:1.05rem;font-family:ui-monospace,Consolas,monospace;margin:2rem 0 .25rem}
.meta{color:#6b7280;font-size:.875rem;margin:.25rem 0 .75rem}
table{border-collapse:collapse;width:100%;font-size:.875rem}
th,td{text-align:left;padding:.35rem .6rem;border-bottom:1px solid #8883}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
a{color:#2E6E80}
</style></head><body>
<h1>Wyniki symulacji — dostęp awaryjny</h1>
<p class="meta">Pliki prosto z magazynu, z pominięciem aplikacji i bazy. Wygenerowano ${new Date().toISOString().replace("T", " ").slice(0, 16)}. Linki tracą ważność po 7 dniach.</p>
${sections.join("\n")}
</body></html>`);

console.log(`\nStrona z linkami: ${OUT}`);
