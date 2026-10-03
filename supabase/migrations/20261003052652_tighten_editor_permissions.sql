begin;

-- The existing trusted app_metadata role "admin" is the superadmin tier.
-- Editors retain publishing rights, but cannot delete articles or manage ads.

drop policy if exists "Restrict article deletes to superadmins" on public.articles;
create policy "Restrict article deletes to superadmins"
on public.articles
as restrictive
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Restrict ad inserts to superadmins" on public.brand_ads;
create policy "Restrict ad inserts to superadmins"
on public.brand_ads
as restrictive
for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Restrict ad updates to superadmins" on public.brand_ads;
create policy "Restrict ad updates to superadmins"
on public.brand_ads
as restrictive
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Restrict ad deletes to superadmins" on public.brand_ads;
create policy "Restrict ad deletes to superadmins"
on public.brand_ads
as restrictive
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

commit;