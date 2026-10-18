-- Uruchom w Supabase SQL Editor. Idempotentne — można uruchamiać wielokrotnie.
--
-- ─── Tabela profili i jej polityki RLS ───────────────────────────────────────
--
-- Tabela `profiles` istniała dotąd wyłącznie w żywej bazie: żadna migracja w
-- repozytorium jej nie tworzyła, a kolejne (`migration_invoice_data.sql`,
-- `migration_sim_access.sql`) tylko dokładały kolumny. Polityki RLS, od których
-- zależy, czy klient A może odczytać dane do faktury klienta B, nie były nigdzie
-- zapisane ani możliwe do odtworzenia. Ten plik to naprawia:
--   * tworzy tabelę, jeśli jej nie ma (nowa baza, środowisko testowe),
--   * dokłada kolumny używane przez kod (lib/invoice.ts, lib/utils/simAccess.ts),
--   * włącza RLS i zapisuje polityki „tylko własny wiersz” pod znanymi nazwami.
--
-- Przeglądarka czyta i zapisuje profil kluczem anon (lib/invoiceClient.ts), więc
-- RLS jest JEDYNĄ barierą między kontami. Panel admina korzysta z service_role
-- i polityk nie potrzebuje.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_type   TEXT,
  ADD COLUMN IF NOT EXISTS company      TEXT,
  ADD COLUMN IF NOT EXISTS full_name    TEXT,
  ADD COLUMN IF NOT EXISTS nip          TEXT,
  ADD COLUMN IF NOT EXISTS street       TEXT,
  ADD COLUMN IF NOT EXISTS postal_code  TEXT,
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS country      TEXT,
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS address      TEXT,
  ADD COLUMN IF NOT EXISTS sim_access              TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sim_access_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sim_access_decided_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sim_access_note         TEXT;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Polityki pod stałymi nazwami: DROP + CREATE, bo Postgres nie zna
-- CREATE POLICY IF NOT EXISTS. Inne polityki, które mogły powstać ręcznie w
-- panelu, zostają — RLS sumuje polityki, a te poniżej i tak ograniczają do
-- własnego wiersza.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Kolumny bramki dostępu zmienia wyłącznie właściciel przez service_role.
-- Klient może zapisać własną prośbę (sim_access='requested'), ale nie może sam
-- nadać sobie 'granted' — pilnuje tego wyzwalacz, bo polityka UPDATE nie umie
-- porównać starej i nowej wartości kolumny.
CREATE OR REPLACE FUNCTION public.profiles_guard_sim_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller TEXT := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
BEGIN
  -- Ograniczamy WYŁĄCZNIE klientów API: anon i zalogowanych. service_role
  -- (panel admina, trasy API, także nowe klucze sb_secret_) oraz SQL Editor
  -- (brak roli w żądaniu) mogą wszystko.
  --
  -- Wersja 1 czytała `request.jwt.claim.role` — ustawienie, którego obecny
  -- PostgREST już nie zakłada. Wyjątek dla service_role nigdy nie zadziałał,
  -- więc przyznanie dostępu z panelu admina kończyło się błędem wyzwalacza.
  IF caller IS NULL OR caller NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.sim_access IS DISTINCT FROM OLD.sim_access
     AND NOT (OLD.sim_access = 'none' AND NEW.sim_access = 'requested') THEN
    RAISE EXCEPTION 'sim_access może zmienić wyłącznie właściciel serwisu';
  END IF;
  IF NEW.sim_access_decided_at IS DISTINCT FROM OLD.sim_access_decided_at THEN
    RAISE EXCEPTION 'sim_access_decided_at może zmienić wyłącznie właściciel serwisu';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_sim_access ON public.profiles;
CREATE TRIGGER profiles_guard_sim_access
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_sim_access();

-- Znacznik dla `npm run sprawdz-baze`: polityk RLS ani wyzwalacza nie widać
-- przez PostgREST, więc ta migracja zostawia funkcję, którą sonda może wywołać.
-- Numer wersji rośnie, gdy polityki się zmienią — wtedy sonda każe uruchomić
-- plik ponownie.
CREATE OR REPLACE FUNCTION public.profiles_policies_version()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$ SELECT 2 $$;

GRANT EXECUTE ON FUNCTION public.profiles_policies_version() TO anon, authenticated, service_role;
