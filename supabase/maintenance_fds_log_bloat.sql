-- ─── Ratunek po zalaniu tabeli zleceń podglądem na żywo ─────────────────────
--
-- Kontekst: maszyna licząca wysyłała cały log (do 1 MB) co 5 sekund, a webhook
-- NADPISYWAŁ nim kolumnę fds_log. Każdy taki UPDATE tworzy nową wersję wiersza,
-- więc przy kilku maszynach naraz tabela puchnie o megabajty na sekundę, a
-- autovacuum nie nadąża. Skutkiem jest zapchany dysk i baza, która przestaje
-- odpowiadać.
--
-- Trwałe rozwiązanie jest w kodzie (log przyrostowy, jedna próbka na 30 s,
-- limit 1 MB w append_fds_log). Ten plik sprząta to, co już się nazbierało.
--
-- URUCHAMIAĆ W EDYTORZE SQL SUPABASE — łączy się bezpośrednio z Postgresem,
-- z pominięciem PostgREST, więc działa także wtedy, gdy REST zwraca 503.

-- ── 1. Rozpoznanie: co właściwie zajmuje miejsce ────────────────────────────
select
  pg_size_pretty(pg_total_relation_size('fds_submissions')) as tabela_z_toast,
  pg_size_pretty(pg_database_size(current_database()))      as cala_baza;

select n_live_tup as zywe, n_dead_tup as martwe, last_autovacuum, last_autoanalyze
from pg_stat_user_tables
where relname = 'fds_submissions';

-- ── 2. Zwolnij treść, której nikt już nie potrzebuje ────────────────────────
-- Zlecenia zakończone: log i podgląd na żywo nie są już do niczego potrzebne,
-- bo komplet wyników leży w magazynie obiektowym. Zostawiamy ostatnie 7 dni,
-- żeby nie zabrać danych z zakładek, które ktoś ma właśnie otwarte.
update fds_submissions
set fds_log    = null,
    devc_csv   = null,
    hrr_csv    = null,
    slice_json = null
where status in ('done', 'failed', 'cancelled')
  and completed_at < now() - interval '7 days'
  and (fds_log is not null or devc_csv is not null or hrr_csv is not null or slice_json is not null);

-- Zlecenia w toku: przytnij log do ostatniego 1 MB (tyle pokazuje strona).
update fds_submissions
set fds_log = right(fds_log, 1000000)
where status = 'running'
  and length(fds_log) > 1000000;

-- ── 3. Odzyskaj miejsce ─────────────────────────────────────────────────────
-- VACUUM zwykły oddaje miejsce do PONOWNEGO UŻYCIA przez tę tabelę, ale nie
-- zwraca go systemowi plików. Wystarczy, żeby baza przestała puchnąć.
vacuum (analyze, verbose) fds_submissions;

-- VACUUM FULL zwraca miejsce systemowi, ale przepisuje całą tabelę: bierze
-- ACCESS EXCLUSIVE (żaden odczyt ani zapis w tym czasie nie przejdzie) i
-- potrzebuje na dysku tyle wolnego, ile waży tabela. Przy zapchanym dysku
-- potrafi się nie udać — odpalać dopiero po punkcie 2 i tylko świadomie.
-- vacuum full fds_submissions;

-- ── 4. Postaw PostgREST z powrotem na nogi ──────────────────────────────────
-- Po zmianach schematu i po dłuższej niedostępności PostgREST bywa, że nie
-- odbuduje sam swojego cache'u schematu (błąd PGRST002 na każdej tabeli).
notify pgrst, 'reload schema';

-- ── 5. Kto trzyma połączenia ────────────────────────────────────────────────
select state, count(*)
from pg_stat_activity
where backend_type = 'client backend'
group by state
order by 2 desc;

select setting::int as max_connections from pg_settings where name = 'max_connections';

-- Zwolnienie bezczynnych połączeń (nie rusza własnego ani procesów systemowych).
-- select pg_terminate_backend(pid)
-- from pg_stat_activity
-- where backend_type = 'client backend'
--   and state = 'idle'
--   and pid <> pg_backend_pid();
