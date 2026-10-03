-- ─── Intensywność pożaru jako cecha modelu czasu ─────────────────────────────
--
-- Prognoza czasu liczenia stoi na kroku czasowym, a krok czasowy dyktuje
-- najszybszy przepływ w domenie — czyli pożar. Poprzedni model wyprowadzał go
-- wyłącznie z kubatury domeny i pożaru nie widział w ogóle: ten sam wzór dawał
-- ten sam krok dla pustego korytarza i dla palących się kabli w tej samej
-- przestrzeni.
--
-- `hrrpua` to największe HRRPUA zadeklarowane w pliku [kW/m²]. Maksimum, nie
-- suma: plik deklaruje wiele powierzchni, z których większość jest niepalna,
-- a o kroku decyduje ta najintensywniejsza.
--
-- Kolumnę wypełnia /api/symulacje/submit przy każdym nowym zleceniu. Model
-- kroku czasowego (lib/fds/timestep.ts) uczy się z niej razem z pozostałymi
-- cechami. Biegi sprzed tej migracji mają NULL i uczestniczą w nauce bez tej
-- cechy — nie trzeba ich uzupełniać, żeby model zadziałał.

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS hrrpua NUMERIC;

COMMENT ON COLUMN fds_submissions.hrrpua IS
  'Najwieksze HRRPUA z pliku FDS [kW/m2]. Cecha modelu kroku czasowego (lib/fds/timestep.ts).';

-- Podgląd pokrycia: ile zleceń ma już tę cechę zapisaną.
SELECT
  count(*)                                   AS zlecen,
  count(hrrpua)                              AS z_hrrpua,
  round(100.0 * count(hrrpua) / nullif(count(*), 0), 1) AS pokrycie_proc
FROM fds_submissions
WHERE status = 'done';
