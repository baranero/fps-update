-- Uruchom w Supabase SQL Editor.
--
-- Dziennik zdarzeń zlecenia + powód niepowodzenia.
--
-- Po co: zlecenie trafiało w stan `failed` w PIĘCIU różnych miejscach (webhook
-- zakończenia i cztery gałęzie crona), a żadne z nich nie zapisywało, dlaczego.
-- Skutek był taki, że na 36 nieudanych biegów dziewięć najdroższych — 169 z 184
-- spalonych złotych — miało pusty `fds_exit_code` i log urwany w połowie
-- poprawnych obliczeń, i po fakcie NIE DAŁO SIĘ ustalić, czy ubił je nadzorca,
-- czy zniknęła maszyna, czy zawiesił się solver.
--
-- Od teraz każda taka decyzja zostawia ślad: kod powodu w `failure_reason`
-- (do zliczania) i wpis w `job_events` (do czytania). Zapisuje je
-- lib/observability.ts.

-- ─── 1. Powód niepowodzenia na samym zleceniu ────────────────────────────────

ALTER TABLE public.fds_submissions
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS failure_detail TEXT;

-- Zamknięty zbiór kodów — inaczej po kwartale będzie pięć wariantów zapisu
-- tego samego powodu i nie da się ich policzyć.
ALTER TABLE public.fds_submissions
  DROP CONSTRAINT IF EXISTS fds_submissions_failure_reason_check;

ALTER TABLE public.fds_submissions
  ADD CONSTRAINT fds_submissions_failure_reason_check
  CHECK (failure_reason IS NULL OR failure_reason IN (
    'fds_error',         -- FDS zgłosił błąd krytyczny w logu (najczęściej plik wejściowy)
    'fds_exit',          -- niezerowy kod wyjścia bez rozpoznanego błędu w logu
    'stalled',           -- nadzorca: brak postępu przez STALL_HOURS
    'dispatch_timeout',  -- maszyna nie przeszła w „running" w DISPATCH_TIMEOUT_H
    'vm_missing',        -- maszyny już nie ma (crash / OOM / usunięcie z zewnątrz)
    'vm_boot_failed',    -- nie udało się w ogóle utworzyć maszyny
    'cancelled_by_user',
    'unknown'
  ));

-- ─── 2. Dziennik zdarzeń ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_events (
  id         BIGSERIAL   PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_id    TEXT,
  level      TEXT        NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  -- Etap ścieżki zlecenia — pozwala pytać „co się psuje przy wysyłce maszyn".
  stage      TEXT        NOT NULL CHECK (stage IN (
    'submit', 'dispatch', 'run', 'complete', 'watchdog', 'cleanup', 'payment', 'invoice', 'access'
  )),
  message    TEXT        NOT NULL,
  meta       JSONB
);

CREATE INDEX IF NOT EXISTS job_events_case_idx  ON public.job_events (case_id, at DESC);
CREATE INDEX IF NOT EXISTS job_events_level_idx ON public.job_events (level, at DESC) WHERE level <> 'info';
CREATE INDEX IF NOT EXISTS job_events_at_idx    ON public.job_events (at DESC);

-- Dziennik czyta wyłącznie panel admina przez service_role. Żadnych polityk
-- publicznych — zdarzenia bywają techniczne i nie są treścią dla klienta.
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- ─── 3. Sprzątanie dziennika ─────────────────────────────────────────────────
--
-- Dziennik rośnie z każdym przebiegiem crona. Trzymamy 90 dni — dłużej i tak
-- nie diagnozujemy, a tabela ma zostać tania. Kasuje go cron sprzątający.
COMMENT ON TABLE public.job_events IS
  'Dziennik zdarzeń zleceń FDS. Retencja 90 dni, kasowane przez /api/cron/cleanup.';
