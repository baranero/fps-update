-- Uruchom w Supabase SQL Editor po migration_hetzner_columns.sql
--
-- Podgląd wyników na żywo: strumieniowane w trakcie obliczeń pliki CSV z FDS
-- (CHID_devc.csv, CHID_hrr.csv) oraz setpointy DEVC z pliku wejściowego
-- (do wyznaczania momentów aktywacji urządzeń).

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS devc_csv        TEXT,    -- ostatnio wysłany (zdownsamplowany) CHID_devc.csv
  ADD COLUMN IF NOT EXISTS hrr_csv         TEXT,    -- ostatnio wysłany CHID_hrr.csv
  ADD COLUMN IF NOT EXISTS devc_setpoints  JSONB,   -- [{id, quantity, setpoint}] z parsera pliku FDS
  ADD COLUMN IF NOT EXISTS stop_requested  BOOLEAN DEFAULT FALSE;  -- łagodne zatrzymanie: maszyna tworzy plik CHID.stop
