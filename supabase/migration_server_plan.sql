-- Uruchom w Supabase SQL Editor.
--
-- Plan doboru maszyny + geometria modelu. Dwa powody:
--   1. procesów MPI nie jest już tyle, co siatek — trzeba zapisać, ile ich było,
--   2. kalibracja predykcji (lib/fds/calibration.ts) potrzebuje rozmiaru komórki
--      i objętości domeny, żeby odtworzyć krok czasowy bez sięgania po plik .fds.

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS server_cores          INTEGER,
  ADD COLUMN IF NOT EXISTS server_location       TEXT,
  ADD COLUMN IF NOT EXISTS mpi_procs             INTEGER,
  ADD COLUMN IF NOT EXISTS omp_threads           INTEGER,
  ADD COLUMN IF NOT EXISTS meshes_per_proc       INTEGER,
  ADD COLUMN IF NOT EXISTS min_cell_dim          NUMERIC,
  ADD COLUMN IF NOT EXISTS domain_volume         NUMERIC,
  ADD COLUMN IF NOT EXISTS dt_estimate           NUMERIC,
  ADD COLUMN IF NOT EXISTS predicted_wall_hours  NUMERIC,
  ADD COLUMN IF NOT EXISTS plan_tier             TEXT;

-- Zlecenia sprzed planera liczyły jeden proces na siatkę, ograniczony liczbą
-- rdzeni maszyny. Uzupełniamy to wstecz, żeby wchodziły do kalibracji.
UPDATE fds_submissions
SET mpi_procs = LEAST(
      mesh_count,
      CASE server_type
        WHEN 'cpx12' THEN 1
        WHEN 'cx23'  THEN 2  WHEN 'cpx22' THEN 2  WHEN 'ccx13' THEN 2  WHEN 'cpx11' THEN 2
        WHEN 'cpx21' THEN 3
        WHEN 'cx33'  THEN 4  WHEN 'cpx32' THEN 4  WHEN 'ccx23' THEN 4  WHEN 'cpx31' THEN 4
        WHEN 'cx43'  THEN 8  WHEN 'cpx42' THEN 8  WHEN 'ccx33' THEN 8  WHEN 'cpx41' THEN 8
        WHEN 'cpx52' THEN 12
        WHEN 'cx53'  THEN 16 WHEN 'cpx62' THEN 16 WHEN 'ccx43' THEN 16 WHEN 'cpx51' THEN 16
        WHEN 'ccx53' THEN 32
        WHEN 'ccx63' THEN 48
        ELSE mesh_count
      END
    )
WHERE mpi_procs IS NULL
  AND mesh_count IS NOT NULL
  AND server_type IS NOT NULL;

-- Indeks pod zapytanie kalibracji (zakończone zlecenia, od najnowszych).
CREATE INDEX IF NOT EXISTS fds_submissions_done_created_idx
  ON fds_submissions (created_at DESC)
  WHERE status = 'done';
