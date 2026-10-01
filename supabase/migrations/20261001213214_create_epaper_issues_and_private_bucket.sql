begin;

create table if not exists public.epaper_issues (
	id uuid primary key default gen_random_uuid(),
	title text not null check (length(trim(title)) > 0),
	issue_date date not null,
	edition text not null default 'Ghana',
	cover_image_url text,
	pdf_storage_path text not null check (pdf_storage_path like 'issues/%'),
	status text not null default 'draft' check (status in ('draft', 'published')),
	created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
	created_at timestamptz not null default now(),
	published_at timestamptz,
	unique (issue_date, edition)
);

create index if not exists epaper_issues_published_date_idx
	on public.epaper_issues (issue_date desc)
	where status = 'published';

alter table public.epaper_issues enable row level security;
revoke all on table public.epaper_issues from anon, authenticated;
grant select (id, title, issue_date, edition, cover_image_url, status, created_at, published_at)
	on public.epaper_issues to anon;
grant select on table public.epaper_issues to authenticated;
grant insert, delete on table public.epaper_issues to authenticated;
grant update (title, issue_date, edition, cover_image_url, pdf_storage_path, status, published_at)
	on public.epaper_issues to authenticated;

drop policy if exists "Anyone can read published epaper issues" on public.epaper_issues;
create policy "Anyone can read published epaper issues"
on public.epaper_issues
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can read all epaper issues" on public.epaper_issues;
create policy "Admins can read all epaper issues"
on public.epaper_issues
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can create epaper issues" on public.epaper_issues;
create policy "Admins can create epaper issues"
on public.epaper_issues
for insert
to authenticated
with check (
	(select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
	and created_by = (select auth.uid())
);

drop policy if exists "Admins can update epaper issues" on public.epaper_issues;
create policy "Admins can update epaper issues"
on public.epaper_issues
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete epaper issues" on public.epaper_issues;
create policy "Admins can delete epaper issues"
on public.epaper_issues
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('epaper', 'epaper', false, 104857600, array['application/pdf']::text[])
on conflict (id) do update
set public = false,
		file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload epaper PDFs" on storage.objects;
create policy "Admins can upload epaper PDFs"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'epaper'
	and (storage.foldername(name))[1] = 'issues'
	and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can update epaper PDFs" on storage.objects;
create policy "Admins can update epaper PDFs"
on storage.objects
for update
to authenticated
using (
	bucket_id = 'epaper'
	and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
	bucket_id = 'epaper'
	and (storage.foldername(name))[1] = 'issues'
	and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can delete epaper PDFs" on storage.objects;
create policy "Admins can delete epaper PDFs"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'epaper'
	and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins and active subscribers can read epaper PDFs" on storage.objects;
create policy "Admins and active subscribers can read epaper PDFs"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'epaper'
	and (storage.foldername(name))[1] = 'issues'
	and (
		(select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
		or (
			exists (
				select 1
				from public.epaper_issues
				where pdf_storage_path = storage.objects.name
					and status = 'published'
			)
			and exists (
				select 1
				from public.subscriptions
				where user_id = (select auth.uid())
					and status = 'active'
					and (next_renewal_at is null or next_renewal_at > now())
			)
		)
	)
);

commit;
