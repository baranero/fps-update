export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { deleteResults } from "@/lib/hetzner/storage";
import { caseModelPaths } from "@/lib/fds/runFile";
import { rateLimit, LIMITS } from "@/lib/utils/rateLimit";

// Usunięcie konta — prawo do bycia zapomnianym (art. 17 RODO).
//
// Wcześniej kasowaliśmy wyłącznie użytkownika z auth.users (profil schodził
// kaskadą), a zlecenia z nazwiskiem, adresem e-mail, uwagami, logiem i plikami
// w dwóch magazynach zostawały na zawsze — cron nigdy ich nie rusza.
//
// Teraz:
//   1. Konto z liczącym zleceniem nie da się usunąć — najpierw trzeba je
//      zatrzymać, inaczej maszyna raportowałaby do zlecenia bez właściciela.
//   2. Każde zlecenie: wyniki z magazynu obiektów i plik wejściowy znikają,
//      a wiersz zostaje PSEUDONIMIZOWANY: bez nazwiska, adresu, uwag, logów
//      i podglądów. Zostaje numer, cena, status i stan płatności — to zapis
//      księgowy (art. 6 ust. 1 lit. c RODO; faktura i tak żyje w ING), nie dane
//      osobowe.
//   3. Dziennik zdarzeń zlecenia idzie do kosza w całości.
//   4. Na końcu znika użytkownik, a z nim kaskadą profil i raporty kalkulatorów.

const LIVE_STATUSES = new Set(["pending", "dispatched", "running"]);
const ANONYMOUS_NAME = "[konto usunięte]";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(req, { scope: "account-delete", identity: user.id, ...LIMITS.accountDelete });
  if (limited) return limited;

  const admin = createAdminClient();

  const { data: jobs, error: jobsError } = await admin
    .from("fds_submissions")
    .select("case_id, status, file_path, results_deleted_at")
    .eq("user_id", user.id);

  if (jobsError) {
    console.error(`account delete [${user.id}]: odczyt zleceń:`, jobsError.message);
    return NextResponse.json({ error: "Błąd bazy danych." }, { status: 500 });
  }

  const live = (jobs ?? []).filter((j) => LIVE_STATUSES.has(j.status));
  if (live.length > 0) {
    return NextResponse.json(
      {
        error: "Masz zlecenie w trakcie obliczeń. Zatrzymaj je albo poczekaj na zakończenie, a potem usuń konto.",
        cases: live.map((j) => j.case_id),
      },
      { status: 409 }
    );
  }

  const failures: string[] = [];
  const now = new Date().toISOString();

  for (const job of jobs ?? []) {
    try {
      if (!job.results_deleted_at) {
        await deleteResults(job.case_id);
        const paths = caseModelPaths(job.file_path);
        if (paths.length) await admin.storage.from("fds-files").remove(paths);
      }

      // Kolumny z pierwszej migracji — ten zapis MUSI przejść.
      const { error: coreErr } = await admin
        .from("fds_submissions")
        .update({ name: ANONYMOUS_NAME, email: "", notes: null, user_id: null })
        .eq("case_id", job.case_id);
      if (coreErr) throw new Error(coreErr.message);

      // Kolumny z późniejszych migracji — każda osobno, bo brak którejś (baza
      // bez migracji) nie może zatrzymać usuwania konta.
      for (const patch of [
        { fds_log: null },
        { devc_csv: null, hrr_csv: null },
        { slice_json: null },
        { results_deleted_at: job.results_deleted_at ?? now },
      ]) {
        const { error } = await admin.from("fds_submissions").update(patch).eq("case_id", job.case_id);
        if (error && !/does not exist|schema cache/i.test(error.message)) {
          console.error(`account delete [${job.case_id}] pseudonimizacja ${Object.keys(patch).join(",")}:`, error.message);
        }
      }

      await admin.from("job_events").delete().eq("case_id", job.case_id);
    } catch (err) {
      console.error(`account delete [${job.case_id}]:`, err);
      failures.push(job.case_id);
    }
  }

  if (failures.length > 0) {
    // Konto zostaje, dopóki nie uda się wyczyścić wszystkiego — lepiej, żeby
    // klient spróbował ponownie, niż żeby jego dane zostały bez właściciela.
    return NextResponse.json(
      { error: "Nie udało się usunąć wszystkich danych zleceń. Spróbuj ponownie za chwilę.", cases: failures },
      { status: 502 }
    );
  }

  // Użytkownik z auth.users — profil i raporty kalkulatorów schodzą kaskadą.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, anonymizedJobs: (jobs ?? []).length });
}
