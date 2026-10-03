-- ─── Wyzerowanie kwot na zleceniach zakończonych błędem ──────────────────────
--
-- W `price` zlecenia siedzi wycena wstępna, zapisywana przy zgłoszeniu. Gdy bieg
-- kończył się błędem, `failJob()` zmieniał status, ale kwoty nie ruszał — więc
-- zlecenie dalej pokazywało należność, której nikt nigdy nie miał pobrać.
-- Mail o niepowodzeniu mówi klientowi wprost: „Nie zostaniesz obciążony kosztami
-- za to zlecenie". Baza mówiła co innego.
--
-- Źródło naprawione w lib/observability.ts (failJob ustawia price = 0). Ten
-- skrypt porządkuje wiersze sprzed tej zmiany.
--
-- Sumy „do zapłaty" w Rozliczeniach i na Pulpicie filtrują status = 'done', więc
-- te kwoty nigdy nie weszły do należności — ale były widoczne przy każdym
-- wierszu i sumowały się w widoku filtra „nieudane".

-- Wymaga kolumny price_old (supabase/migration_price_backup.sql) — zachowujemy
-- pierwotną wycenę, żeby operacja była odwracalna.
ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS price_old NUMERIC;

-- ── 1. Podgląd: co zostanie zmienione ────────────────────────────────────────
SELECT
  count(*)      AS zlecen,
  sum(price)    AS laczna_kwota
FROM fds_submissions
WHERE status IN ('failed', 'error')
  AND price > 0;

-- ── 2. Właściwa zmiana ───────────────────────────────────────────────────────
-- price_old wypełniamy tylko tam, gdzie jest jeszcze puste: kolumna ma trzymać
-- PIERWSZĄ zapisaną kwotę, niezależnie od liczby późniejszych korekt.
UPDATE fds_submissions
SET
  price_old = COALESCE(price_old, price),
  price     = 0
WHERE status IN ('failed', 'error')
  AND price > 0;

-- ── 3. Cofnięcie, gdyby zaszła potrzeba ──────────────────────────────────────
-- UPDATE fds_submissions
-- SET price = price_old
-- WHERE status IN ('failed', 'error') AND price_old IS NOT NULL AND price = 0;
