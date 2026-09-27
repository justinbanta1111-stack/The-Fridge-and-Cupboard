create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 3 and 2000),
  contact text,
  created_at timestamptz not null default now()
);

grant insert on public.suggestions to anon, authenticated;
grant all on public.suggestions to service_role;

alter table public.suggestions enable row level security;

create policy "Anyone can send a suggestion"
on public.suggestions
for insert
to anon, authenticated
with check (true);