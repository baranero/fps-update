-- Uruchom w Supabase SQL Editor po migration_devc_stream.sql
--
-- Podgląd przekroju na żywo („jak Smokeview"): ostatnia klatka wybranego
-- przekroju SLCF (.sf), zdownsamplowana i skwantyzowana na maszynie liczącej,
-- strumieniowana w trakcie obliczeń tym samym webhookiem co DEVC/HRR.
--
-- Zapis do tej kolumny jest best-effort i wykonywany osobnym UPDATE, więc jej
-- brak (nieuruchomiona migracja) NIE blokuje strumienia DEVC/HRR/logu.

ALTER TABLE fds_submissions
  ADD COLUMN IF NOT EXISTS slice_json JSONB;  -- ostatnia klatka przekroju {q,unit,t,w,h,plane,pos,ax,ay,x0..y1,vmin,vmax,data(base64 uint8)}
