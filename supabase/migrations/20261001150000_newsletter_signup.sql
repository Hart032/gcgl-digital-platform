begin;

create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signups enable row level security;

drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_signups;
create policy "Anyone can subscribe to newsletter"
on public.newsletter_signups
for insert
to anon, authenticated
with check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$');

drop policy if exists "Authenticated staff can view subscriptions" on public.newsletter_signups;
create policy "Authenticated staff can view subscriptions"
on public.newsletter_signups
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

commit;
