-- Język zlecenia — decyduje o języku maili transakcyjnych do klienta.
--
-- Trasa /api/symulacje/[caseId]/complete wywoływana jest przez maszynę liczącą
-- (callback), więc w momencie wysyłki maila „obliczenia zakończone" nie ma ani
-- sesji użytkownika, ani nagłówka Accept-Language. Jedyne wiarygodne źródło
-- języka to zapis zrobiony przy składaniu zlecenia.
--
-- Domyślnie 'pl' — zgodnie z językiem domyślnym serwisu i ze stanem zleceń
-- złożonych przed wprowadzeniem wersji angielskiej.

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'pl';

-- Dopuszczamy wyłącznie języki obsługiwane przez serwis (i18n/routing.ts).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fds_submissions_locale_check'
  ) THEN
    ALTER TABLE fds_submissions
      ADD CONSTRAINT fds_submissions_locale_check CHECK (locale IN ('pl', 'en'));
  END IF;
END $$;
