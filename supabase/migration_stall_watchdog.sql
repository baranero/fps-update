-- Nadzorca oparty na POSTĘPIE, nie na czasie trwania.
--
-- Cron zapisuje przy każdym przebiegu, jak daleko doszły obliczenia. Dopiero gdy
-- ten ślad nie drgnie przez STALL_HOURS (lib/fds/watchdog.ts), zlecenie uznajemy
-- za zawieszone i zwalniamy maszynę. Wcześniejsza reguła ubijała zdrowe, wolno
-- liczące symulacje, bo mierzyła trafność naszej wyceny, a nie stan solvera.
--
-- Bez tych kolumn cron NIE ubija niczego, co jeszcze żyje — zamyka wyłącznie
-- zlecenia, których maszyna już nie istnieje, i zgłasza brak migracji w logu.

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS last_sim_time    NUMERIC,      -- czas symulacji [s] z ostatniego odczytu
  ADD COLUMN IF NOT EXISTS last_log_bytes   INTEGER,      -- długość logu przy ostatnim odczycie
  ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;  -- kiedy ostatnio cokolwiek drgnęło

-- Skan po statusie i znaczniku postępu robi każdy przebieg crona.
CREATE INDEX IF NOT EXISTS idx_fds_submissions_running_progress
  ON fds_submissions (status, last_progress_at)
  WHERE status = 'running';
