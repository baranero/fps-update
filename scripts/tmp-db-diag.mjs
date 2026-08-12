// Diagnostyka wydajności: co waży w tabeli zleceń i jak długo trwają zapytania,
// których używa strona. Wyłącznie odczyty.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const timed = async (label, fn) => {
  const t0 = Date.now();
  try {
    const r = await fn();
    const ms = Date.now() - t0;
    console.log(`${String(ms).padStart(6)} ms  ${label}${r?.error ? `  BŁĄD: ${r.error.message}` : ""}`);
    return r;
  } catch (e) {
    console.log(`${String(Date.now() - t0).padStart(6)} ms  ${label}  WYJĄTEK: ${e.message}`);
    return null;
  }
};

// 1. Najtańsze możliwe zapytanie — czysta latencja bazy.
await timed("pusty count (latencja bazy)", () =>
  supabase.from("fds_submissions").select("case_id", { count: "exact", head: true })
);

// 2. Lista zleceń — to, co robi strona /symulacje.
await timed("historia (wąski select, 50 wierszy)", () =>
  supabase.from("fds_submissions")
    .select("case_id, file_name, status, created_at, price")
    .order("created_at", { ascending: false }).limit(50)
);

// 3. Ile ważą duże kolumny w zleceniach w toku.
const { data: rows } = await timed("rozmiary kolumn dla running", () =>
  supabase.from("fds_submissions")
    .select("case_id, status, fds_log, devc_csv, hrr_csv, slice_json")
    .eq("status", "running")
);

let total = 0;
if (rows) {
  console.log("\nzlecenie                 fds_log     devc     hrr    slice     razem");
  for (const r of rows) {
    const b = (v) => (v == null ? 0 : typeof v === "string" ? v.length : JSON.stringify(v).length);
    const parts = [b(r.fds_log), b(r.devc_csv), b(r.hrr_csv), b(r.slice_json)];
    const sum = parts.reduce((a, c) => a + c, 0);
    total += sum;
    const kb = (n) => `${(n / 1024).toFixed(0)}K`.padStart(8);
    console.log(`${r.case_id.padEnd(22)} ${parts.map(kb).join(" ")} ${kb(sum)}`);
  }
  console.log(`\nRazem w wierszach "running": ${(total / 1024 / 1024).toFixed(1)} MB`);
}

// 4. Pojedyncze zlecenie tak, jak pobiera je strona szczegółów (select *).
if (rows?.length) {
  const id = rows[0].case_id;
  await timed(`select * dla ${id} (tak robi strona, co 3 s)`, () =>
    supabase.from("fds_submissions").select("*, payment_status, stripe_session_id").eq("case_id", id).single()
  );
}

// 5. Ile w ogóle jest wierszy i ile z nich trzyma wielkie kolumny.
const { count: all } = await supabase.from("fds_submissions").select("case_id", { count: "exact", head: true });
const { count: withLog } = await supabase.from("fds_submissions").select("case_id", { count: "exact", head: true }).not("fds_log", "is", null);
console.log(`\nWierszy łącznie: ${all} · z zapisanym fds_log: ${withLog}`);
