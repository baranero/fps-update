-- Uruchom w Supabase SQL Editor.
--
-- ─── Dostęp do uruchamiania symulacji ────────────────────────────────────────
--
-- Do tej pory bramka („kto może odpalić płatną maszynę") była zaszyta w kodzie:
-- `isSimAllowed()` porównywał e-mail z ADMIN_EMAIL, więc dostęp miała dokładnie
-- jedna osoba. Dla obcego kreator kończył się panelem „napisz do nas" — lejek
-- urywał się na adresie e-mail, poza produktem, bez śladu w bazie i bez kolejki,
-- którą właściciel mógłby obsłużyć.
--
-- Decyzja zostaje po stronie właściciela (maszyna kosztuje realne pieniądze,
-- a płatność następuje PO obliczeniach), ale przenosimy ją do bazy, żeby:
--   * klient mógł poprosić o dostęp jednym kliknięciem, z konta, które już ma,
--   * właściciel widział kolejkę próśb w panelu i przyznawał dostęp na miejscu,
--   * dało się dostęp cofnąć bez wdrożenia nowej wersji kodu.
--
-- Stany:
--   none      — konto nigdy nie prosiło o dostęp (domyślny),
--   requested — poproszono, czeka na decyzję właściciela,
--   granted   — może uruchamiać zlecenia,
--   blocked   — odmowa; kolejna prośba nie jest możliwa.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sim_access              TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sim_access_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sim_access_decided_at   TIMESTAMPTZ,
  -- Po co klientowi obliczenia: kontekst dla właściciela przy decyzji.
  ADD COLUMN IF NOT EXISTS sim_access_note         TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sim_access_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sim_access_check
  CHECK (sim_access IN ('none', 'requested', 'granted', 'blocked'));

-- Kolejka próśb w panelu admina sortuje się po dacie zgłoszenia.
CREATE INDEX IF NOT EXISTS profiles_sim_access_idx
  ON public.profiles (sim_access, sim_access_requested_at DESC);

-- Konta, które zdążyły już coś policzyć, miały dostęp de facto — niech go
-- zachowają, żeby wdrożenie tej zmiany nikomu niczego nie odebrało.
UPDATE public.profiles p
SET sim_access = 'granted',
    sim_access_decided_at = COALESCE(p.sim_access_decided_at, NOW())
WHERE p.sim_access = 'none'
  AND EXISTS (SELECT 1 FROM public.fds_submissions s WHERE s.user_id = p.id);

-- ─── Dziennik zdarzeń ────────────────────────────────────────────────────────
--
-- Prośba o dostęp i decyzja właściciela to zdarzenia KONTA, nie zlecenia —
-- jedyny etap zapisywany bez `case_id`. Trzeba więc dopuścić etap 'access'
-- w ograniczeniu na kolumnie `stage`.
--
-- Wykonujemy to WARUNKOWO, bo tabela `job_events` przybywa osobną migracją
-- (migration_job_events.sql), która może jeszcze nie być uruchomiona — i wtedy
-- twardy ALTER wywracał cały ten plik komunikatem
-- „relation public.job_events does not exist".
--
-- Kolejność migracji przestaje więc mieć znaczenie:
--   * job_events JUŻ istnieje  → ograniczenie zostaje rozszerzone tutaj,
--   * job_events jeszcze NIE   → pomijamy; migration_job_events.sql ma etap
--                                'access' w swojej definicji, więc tabela
--                                powstanie od razu z kompletem etapów.
--
-- Sam kod jest na brak tej tabeli odporny: `logEvent()` w lib/observability.ts
-- rozpoznaje „nieuruchomiona migracja" i milczy, zamiast wywracać zlecenie.

DO $$
BEGIN
  IF to_regclass('public.job_events') IS NOT NULL THEN
    ALTER TABLE public.job_events
      DROP CONSTRAINT IF EXISTS job_events_stage_check;

    ALTER TABLE public.job_events
      ADD CONSTRAINT job_events_stage_check
      CHECK (stage IN (
        'submit', 'dispatch', 'run', 'complete', 'watchdog', 'cleanup', 'payment', 'invoice', 'access'
      ));
  END IF;
END $$;
