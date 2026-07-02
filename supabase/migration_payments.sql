-- Dodaj kolumny płatności do fds_submissions
alter table public.fds_submissions
  add column if not exists payment_status  text,        -- null | 'pending' | 'paid'
  add column if not exists stripe_session_id text;

create index if not exists fds_submissions_stripe_session_idx
  on public.fds_submissions (stripe_session_id)
  where stripe_session_id is not null;
