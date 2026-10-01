begin;

alter table public.articles enable row level security;

revoke all on table public.articles from anon, authenticated;
grant select on table public.articles to anon, authenticated;
grant insert, update, delete on table public.articles to authenticated;

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
on public.articles
for select
to anon
using (status = 'published');

drop policy if exists "Authenticated users can read published articles" on public.articles;
create policy "Authenticated users can read published articles"
on public.articles
for select
to authenticated
using (status = 'published');

drop policy if exists "Editors can read all articles" on public.articles;
create policy "Editors can read all articles"
on public.articles
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Restrict article reads to published or editors" on public.articles;
create policy "Restrict article reads to published or editors"
on public.articles
as restrictive
for select
to anon, authenticated
using (
	status = 'published'
	or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
);

drop policy if exists "Editors can create articles" on public.articles;
create policy "Editors can create articles"
on public.articles
for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Restrict article inserts to editors" on public.articles;
create policy "Restrict article inserts to editors"
on public.articles
as restrictive
for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Editors can update articles" on public.articles;
create policy "Editors can update articles"
on public.articles
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Restrict article updates to editors" on public.articles;
create policy "Restrict article updates to editors"
on public.articles
as restrictive
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Editors can delete articles" on public.articles;
create policy "Editors can delete articles"
on public.articles
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Restrict article deletes to editors" on public.articles;
create policy "Restrict article deletes to editors"
on public.articles
as restrictive
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Editors can upload article media" on storage.objects;
create policy "Editors can upload article media"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'media'
	and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
);

drop policy if exists "Restrict media uploads to editors" on storage.objects;
create policy "Restrict media uploads to editors"
on storage.objects
as restrictive
for insert
to anon, authenticated
with check (
	bucket_id <> 'media'
	or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
);

commit;
