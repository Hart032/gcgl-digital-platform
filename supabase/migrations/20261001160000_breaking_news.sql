begin;

create table if not exists public.breaking_news (
  id uuid primary key default gen_random_uuid(),
  headline text not null check (length(trim(headline)) > 0),
  created_at timestamptz not null default now()
);

alter table public.breaking_news enable row level security;

alter publication supabase_realtime add table public.breaking_news;

drop policy if exists "Public can read breaking news" on public.breaking_news;
create policy "Public can read breaking news"
on public.breaking_news
for select
to anon, authenticated
using (true);

drop policy if exists "Editors can insert breaking news" on public.breaking_news;
create policy "Editors can insert breaking news"
on public.breaking_news
for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Editors can update breaking news" on public.breaking_news;
create policy "Editors can update breaking news"
on public.breaking_news
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Editors can delete breaking news" on public.breaking_news;
create policy "Editors can delete breaking news"
on public.breaking_news
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

commit;
