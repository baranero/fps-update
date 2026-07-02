-- Uruchom w Supabase SQL Editor po migration_payments.sql

-- Śledzenie kiedy pliki wynikowe zostały usunięte ze storage
ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS results_deleted_at TIMESTAMPTZ;

-- Indeks dla cron cleanup (szybkie wyszukiwanie kandydatów do usunięcia)
CREATE INDEX IF NOT EXISTS fds_submissions_cleanup_idx
  ON fds_submissions (completed_at, status)
  WHERE results_deleted_at IS NULL;
