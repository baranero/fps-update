// Sprawdza, czy migracja nadzorcy weszła: odpytuje bazę DOKŁADNIE tym
// zapytaniem, którego używa cron, i pokazuje stan zleceń w toku.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// 1. Zapytanie crona — jeśli kolumn nie ma, PostgREST zwróci błąd.
const { data, error } = await supabase
  .from("fds_submissions")
  .select("case_id, server_id, started_at, fds_log, last_sim_time, last_log_bytes, last_progress_at")
  .eq("status", "running")
  .not("started_at", "is", null);

if (error) {
  console.log("NIEGOTOWE — zapytanie crona nie przechodzi:");
  console.log("  ", error.message);
  process.exit(1);
}

console.log("OK — kolumny nadzorcy są na miejscu (zapytanie crona przechodzi).");
console.log(`Zleceń w statusie "running": ${data.length}`);

const H = 3_600_000;
for (const r of data) {
  const simTimes = Array.from(String(r.fds_log ?? "").matchAll(/Simulation Time:\s*([\d.E+-]+)\s*s/g));
  const simNow = simTimes.length ? parseFloat(simTimes[simTimes.length - 1][1]) : null;
  const since = r.last_progress_at ?? r.started_at;
  const h = since ? ((Date.now() - new Date(since).getTime()) / H).toFixed(1) : "—";
  console.log(
    `  • ${r.case_id}  T=${simNow ?? "—"} s  log=${(r.fds_log?.length ?? 0)} B  ` +
    `ślad: ${r.last_progress_at ? `T=${r.last_sim_time ?? "—"}, ${r.last_log_bytes ?? 0} B` : "brak (pierwszy przebieg)"}  ` +
    `bez ruchu: ${h} h`
  );
}

// 2. Czy któreś zlecenie zostałoby ubite przy najbliższym przebiegu.
console.log("\nPo pierwszym przebiegu cron tylko zapisze ślad — ubić może dopiero,");
console.log("gdy ten ślad nie drgnie przez kolejne 3 h.");
