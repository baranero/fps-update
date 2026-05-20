-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Tabela zgłoszeń
CREATE TABLE IF NOT EXISTS fds_submissions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id         TEXT        UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Dane kontaktowe
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  notes           TEXT,

  -- Plik FDS
  file_name       TEXT        NOT NULL,
  file_path       TEXT        NOT NULL,   -- ścieżka w Supabase Storage
  file_size_kb    NUMERIC,

  -- Wyniki parsowania
  chid            TEXT,
  mesh_count      INTEGER,
  total_cells     BIGINT,
  t_end           NUMERIC,
  fuel            TEXT,
  obst_count      INTEGER,
  vent_count      INTEGER,
  devc_count      INTEGER,

  -- Wycena
  cpu_hours       NUMERIC,
  wall_hours      NUMERIC,
  price           NUMERIC,
  complexity      TEXT,

  -- Status zlecenia
  status          TEXT        DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'running', 'done', 'cancelled'))
);

-- 2. Storage bucket na pliki FDS
-- Uruchom osobno w Dashboard → Storage → New bucket
-- Nazwa: fds-files, Public: NIE

-- 3. RLS – odczyt tylko przez service role (API route)
ALTER TABLE fds_submissions ENABLE ROW LEVEL SECURITY;

-- Brak polityk publicznych – dostęp wyłącznie przez service_role key
