begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.assign_registered_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
		|| jsonb_build_object('role', coalesce(new.raw_app_meta_data ->> 'role', 'registered'));
	return new;
end;
$$;

revoke all on function private.assign_registered_role() from public, anon, authenticated;

drop trigger if exists assign_default_registered_role on auth.users;
create trigger assign_default_registered_role
before insert on auth.users
for each row execute function private.assign_registered_role();

create table if not exists public.profiles (
	user_id uuid primary key references auth.users(id) on delete cascade,
	full_name text not null default '',
	phone text not null default '',
	region text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists profiles_updated_at_idx
	on public.profiles (updated_at desc);

create table if not exists public.subscriptions (
	user_id uuid primary key references auth.users(id) on delete cascade,
	plan text not null default 'Premium Monthly'
		check (plan in ('Premium Monthly', 'Premium Annual', 'Family Bundle')),
	status text not null default 'inactive'
		check (status in ('inactive', 'active', 'paused', 'cancelled')),
	next_renewal_at timestamptz,
	updated_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;

create or replace function private.create_user_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.profiles (user_id, full_name, phone, region)
	values (
		new.id,
		coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
		coalesce(new.raw_user_meta_data ->> 'phone', ''),
		coalesce(new.raw_user_meta_data ->> 'region', '')
	)
	on conflict (user_id) do nothing;

	insert into public.subscriptions (user_id)
	values (new.id)
	on conflict (user_id) do nothing;

	return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.create_user_records() from public, anon, authenticated;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"registered"}'::jsonb
where raw_app_meta_data ->> 'role' is null;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();

drop trigger if exists on_auth_user_created_records on auth.users;
create trigger on_auth_user_created_records
after insert on auth.users
for each row execute function private.create_user_records();

insert into public.profiles (user_id, full_name, phone, region)
select
	id,
	coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''),
	coalesce(raw_user_meta_data ->> 'phone', ''),
	coalesce(raw_user_meta_data ->> 'region', '')
from auth.users
on conflict (user_id) do nothing;

insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, region) on table public.profiles to authenticated;

drop policy if exists "Users and admins can read profiles" on public.profiles;
create policy "Users and admins can read profiles"
on public.profiles
for select
to authenticated
using (
	user_id = (select auth.uid())
	or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Users and admins can update profiles" on public.profiles;
create policy "Users and admins can update profiles"
on public.profiles
for update
to authenticated
using (
	user_id = (select auth.uid())
	or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
	user_id = (select auth.uid())
	or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

alter table public.subscriptions enable row level security;
revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant update (plan, status, next_renewal_at) on table public.subscriptions to authenticated;

drop policy if exists "Users and admins can read subscriptions" on public.subscriptions;
create policy "Users and admins can read subscriptions"
on public.subscriptions
for select
to authenticated
using (
	user_id = (select auth.uid())
	or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can manage subscriptions" on public.subscriptions;
create policy "Admins can manage subscriptions"
on public.subscriptions
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Editors can read all articles" on public.articles;
drop policy if exists "Admins and editors can read all articles" on public.articles;
create policy "Admins and editors can read all articles"
on public.articles
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Restrict article reads to published or editors" on public.articles;
create policy "Restrict article reads to published or admins"
on public.articles
as restrictive
for select
to anon, authenticated
using (
	status = 'published'
	or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor')
);

drop policy if exists "Editors can create articles" on public.articles;
drop policy if exists "Restrict article inserts to editors" on public.articles;
create policy "Admins and editors can create articles"
on public.articles
for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));
create policy "Restrict article inserts to admins"
on public.articles
as restrictive
for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Editors can update articles" on public.articles;
drop policy if exists "Restrict article updates to editors" on public.articles;
create policy "Admins and editors can update articles"
on public.articles
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));
create policy "Restrict article updates to admins"
on public.articles
as restrictive
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Editors can delete articles" on public.articles;
drop policy if exists "Restrict article deletes to editors" on public.articles;
create policy "Admins and editors can delete articles"
on public.articles
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));
create policy "Restrict article deletes to admins"
on public.articles
as restrictive
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Editors can upload article media" on storage.objects;
drop policy if exists "Restrict media uploads to editors" on storage.objects;
create policy "Admins and editors can upload article media"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'media'
	and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor')
);
create policy "Restrict media uploads to admins"
on storage.objects
as restrictive
for insert
to anon, authenticated
with check (
	bucket_id <> 'media'
	or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor')
);

drop policy if exists "Editors can insert breaking news" on public.breaking_news;
drop policy if exists "Editors can update breaking news" on public.breaking_news;
drop policy if exists "Editors can delete breaking news" on public.breaking_news;
create policy "Admins and editors can insert breaking news"
on public.breaking_news
for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));
create policy "Admins and editors can update breaking news"
on public.breaking_news
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));
create policy "Admins and editors can delete breaking news"
on public.breaking_news
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Admins and editors can moderate comments" on public.article_comments;
create policy "Admins and editors can moderate comments"
on public.article_comments
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Admins and editors can delete comments" on public.article_comments;
create policy "Admins and editors can delete comments"
on public.article_comments
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Authenticated staff can view subscriptions" on public.newsletter_signups;
drop policy if exists "Admins can view newsletter signups" on public.newsletter_signups;
create policy "Admins can view newsletter signups"
on public.newsletter_signups
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

commit;
