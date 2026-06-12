-- Uruchom w Supabase SQL Editor po migration_fds_submissions.sql

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS server_id      BIGINT,
  ADD COLUMN IF NOT EXISTS server_type    TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fds_exit_code  INTEGER;

-- Rozszerz CHECK o nowe statusy
ALTER TABLE fds_submissions
  DROP CONSTRAINT IF EXISTS fds_submissions_status_check;

ALTER TABLE fds_submissions
  ADD CONSTRAINT fds_submissions_status_check
  CHECK (status IN ('pending', 'dispatched', 'running', 'done', 'failed', 'cancelled'));

-- Przemianuj cpu_hours → vcpu_hours jeśli istnieje stara kolumna
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fds_submissions' AND column_name = 'cpu_hours'
  ) THEN
    ALTER TABLE fds_submissions RENAME COLUMN cpu_hours TO vcpu_hours;
  END IF;
END $$;
