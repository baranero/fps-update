-- Uruchom w Supabase SQL Editor.
--
-- Dane nabywcy do faktury w rozbiciu wymaganym przez przepisy i przez strukturę
-- faktury ustrukturyzowanej (KSeF, schemat FA(2)). Do tej pory cały adres leżał
-- w jednym wolnym polu `address`, więc:
--   * nie dało się go wysłać do KSeF bez rozcinania heurystyką,
--   * nie było wiadomo, czy nabywca jest firmą, osobą prywatną czy podatnikiem
--     z UE — a od tego zależy, czy faktura idzie z 23% VAT, czy na odwrotne
--     obciążenie (art. 28b ustawy o VAT),
--   * NIP nie był walidowany, więc literówka wychodziła dopiero przy korekcie.
--
-- Walidacja i mapowanie kolumn: lib/invoice.ts (jedno źródło prawdy).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buyer_type  TEXT DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS street      TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city        TEXT,
  ADD COLUMN IF NOT EXISTS country     TEXT DEFAULT 'PL';

-- Typ nabywcy steruje tym, które pola są wymagane — ograniczamy go do wartości
-- znanych aplikacji, żeby literówka nie przeszła cicho do rozliczeń.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_buyer_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_buyer_type_check
  CHECK (buyer_type IS NULL OR buyer_type IN ('company', 'person', 'eu', 'nonEu'));

-- ─── Przeniesienie danych ze starego pola `address` ──────────────────────────
--
-- Zapisy mają postać „ul. Przykładowa 1, 00-000 Warszawa". Rozcinamy to, co da
-- się rozciąć jednoznacznie (kod pocztowy w formacie NN-NNN), a resztę zostawiamy
-- w `street` — użytkownik poprawi ją w formularzu, mając dane nadal przed oczami.
-- Nic nie kasujemy: kolumna `address` zostaje jako kopia zapasowa.

UPDATE public.profiles
SET
  postal_code = COALESCE(postal_code, (regexp_match(address, '(\d{2}-\d{3})'))[1]),
  city = COALESCE(
    city,
    NULLIF(TRIM(BOTH ' ,' FROM (regexp_match(address, '\d{2}-\d{3}\s+(.+)$'))[1]), '')
  ),
  street = COALESCE(
    street,
    NULLIF(TRIM(BOTH ' ,' FROM SPLIT_PART(address, (regexp_match(address, '(\d{2}-\d{3})'))[1], 1)), '')
  )
WHERE address IS NOT NULL
  AND address <> ''
  AND address ~ '\d{2}-\d{3}';

-- Adresy bez rozpoznawalnego kodu pocztowego trafiają w całości do `street`.
UPDATE public.profiles
SET street = address
WHERE address IS NOT NULL
  AND address <> ''
  AND street IS NULL;

-- Konta z NIP-em to firmy, reszta to osoby prywatne — lepszy punkt startowy
-- niż domyślne 'company' dla każdego.
UPDATE public.profiles
SET buyer_type = CASE WHEN COALESCE(TRIM(nip), '') <> '' THEN 'company' ELSE 'person' END
WHERE buyer_type IS NULL;

UPDATE public.profiles
SET country = 'PL'
WHERE country IS NULL;
