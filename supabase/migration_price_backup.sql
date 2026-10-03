-- ─── Kopia ceny sprzed przeliczenia cennika ──────────────────────────────────
--
-- Przeliczenie historycznych zleceń na nowe stawki marży (scripts/przelicz-ceny.ts)
-- nadpisuje kolumnę `price`. Bez kopii operacja jest nieodwracalna: stara kwota
-- znika, a odtworzyć jej z niczego się nie da — ceny nie wynikają z zapisanych
-- w bazie kosztów, bo rozmiar wyników nigdy nie był przechowywany.
--
-- `price_old` wypełnia się RAZ, przy pierwszym przeliczeniu, i od tego momentu
-- zostaje nietknięta — także przy kolejnych zmianach cennika. Dzięki temu zawsze
-- wiadomo, ile zlecenie kosztowało pierwotnie, niezależnie od liczby korekt.

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS price_old NUMERIC;

COMMENT ON COLUMN fds_submissions.price_old IS
  'Cena sprzed pierwszego przeliczenia cennika. Wypełniana raz przez scripts/przelicz-ceny.ts, nigdy nie nadpisywana.';

-- Podgląd skutków przeliczenia. Wiersze bez price_old nie były jeszcze objęte
-- żadną korektą cennika.
CREATE OR REPLACE VIEW fds_price_changes AS
SELECT
  case_id,
  created_at::date AS data,
  price_old        AS cena_pierwotna,
  price            AS cena_obecna,
  price - price_old AS roznica,
  CASE WHEN price_old > 0 THEN round((price / price_old)::numeric, 3) END AS krotnosc,
  payment_status
FROM fds_submissions
WHERE price_old IS NOT NULL
ORDER BY created_at;
