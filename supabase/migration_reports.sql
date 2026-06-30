-- Tabela historii raportów generowanych z kalkulatorów
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  calculator   text not null,
  format       text,
  project_name text,
  share_url    text,
  created_at   timestamptz not null default now()
);

-- Indeks do szybkiego filtrowania po user_id
create index if not exists reports_user_id_idx on public.reports (user_id, created_at desc);

-- RLS
alter table public.reports enable row level security;

-- Użytkownik widzi tylko swoje raporty
create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = user_id);

-- Wstawianie przez API route (service role omija RLS)
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = user_id);

-- ── Jeśli tabela już istnieje, dodaj brakującą kolumnę ──
alter table public.reports add column if not exists share_url text;
