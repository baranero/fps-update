// Czy zlecenia w toku faktycznie liczą? Dwie próbki logu w odstępie kilku minut
// — dokładnie ten sygnał, na którym opiera się nadzorca.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const GAP_MS = Number(process.argv[2] ?? 180) * 1000;

const sample = async () => {
  const { data, error } = await supabase
    .from("fds_submissions")
    .select("case_id, started_at, fds_log, server_id")
    .eq("status", "running");
  if (error) throw new Error(error.message);
  const m = new Map();
  for (const r of data) {
    const st = Array.from(String(r.fds_log ?? "").matchAll(/Simulation Time:\s*([\d.E+-]+)\s*s/g));
    m.set(r.case_id, {
      simTime: st.length ? parseFloat(st[st.length - 1][1]) : null,
      bytes: r.fds_log?.length ?? 0,
      startedAt: r.started_at,
      serverId: r.server_id,
    });
  }
  return m;
};

const a = await sample();
console.log(`Próbka 1: ${a.size} zleceń. Czekam ${GAP_MS / 1000} s…`);
await new Promise((r) => setTimeout(r, GAP_MS));
const b = await sample();

const H = 3_600_000;
let alive = 0;
let stuck = 0;
console.log("\nstan            zlecenie              ΔT [s]   Δlog [B]   wiek [h]  maszyna");
for (const [id, s1] of a) {
  const s2 = b.get(id);
  if (!s2) { console.log(`zniknęło        ${id}`); continue; }
  const dT = (s2.simTime ?? 0) - (s1.simTime ?? 0);
  const dB = s2.bytes - s1.bytes;
  const moved = dT > 0 || dB > 0;
  if (moved) alive++; else stuck++;
  const age = ((Date.now() - new Date(s1.startedAt).getTime()) / H).toFixed(1);
  console.log(
    `${(moved ? "LICZY" : "STOI").padEnd(15)} ${id.padEnd(22)} ${dT.toFixed(2).padStart(7)} ${String(dB).padStart(9)} ${age.padStart(9)}  ${s2.serverId ?? "brak"}`
  );
}
console.log(`\nLiczących: ${alive} · stojących: ${stuck}`);
