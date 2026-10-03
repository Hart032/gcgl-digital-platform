begin;

alter table public.profiles
  add column if not exists membership_tier text
    check (membership_tier in ('Gold', 'Silver', 'Diamond'));

grant update (membership_tier) on public.profiles to authenticated;

create or replace function private.prevent_self_assigning_membership_tier()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.membership_tier is distinct from old.membership_tier
     and coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'admin' then
    raise exception 'Only administrators can change membership tiers'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_self_assigning_membership_tier() from public, anon, authenticated;

drop trigger if exists prevent_self_assigning_membership_tier on public.profiles;
create trigger prevent_self_assigning_membership_tier
before update of membership_tier on public.profiles
for each row execute function private.prevent_self_assigning_membership_tier();

alter table public.articles
  add column if not exists video_provider text,
  add column if not exists post_type text not null default 'article';

update public.articles
set post_type = 'video',
    video_provider = coalesce(video_provider, 'file')
where video_url is not null;

alter table public.articles
  add constraint articles_post_type_check
    check (post_type in ('article', 'video')),
  add constraint articles_video_requires_url
    check (post_type <> 'video' or video_url is not null),
  add constraint articles_video_provider_check
    check (video_provider is null or video_provider in ('file', 'youtube', 'vimeo', 'other'));

create index if not exists articles_published_videos_idx
  on public.articles (published_at desc)
  where status = 'published' and post_type = 'video';

drop policy if exists "Anyone can view article comments" on public.article_comments;
create policy "Read comments for visible articles"
on public.article_comments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.articles a
    where a.id = article_comments.article_id
      and (
        a.status = 'published'
        or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor')
      )
  )
);

drop policy if exists "Authenticated users can post comments" on public.article_comments;
create policy "Signed-in users can comment on published articles"
on public.article_comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.articles a
    where a.id = article_comments.article_id
      and a.status = 'published'
  )
);

alter table public.epaper_issues
  add column if not exists brand text not null default 'Daily Graphic';

grant select (brand) on public.epaper_issues to anon;

alter table public.epaper_issues
  add constraint epaper_issues_brand_check
    check (brand in ('Daily Graphic', 'The Mirror', 'Graphic Showbiz', 'Graphic Sports', 'Graphic Business', 'Junior Graphic'));

alter table public.epaper_issues
  drop constraint if exists epaper_issues_issue_date_edition_key;

create unique index if not exists epaper_issues_brand_date_edition_key
  on public.epaper_issues (brand, issue_date, edition);

create table if not exists public.brand_ads (
  id uuid primary key default gen_random_uuid(),
  brand text not null
    check (brand in ('Daily Graphic', 'The Mirror', 'Graphic Showbiz', 'Graphic Sports', 'Graphic Business', 'Junior Graphic')),
  placement text not null
    check (placement in ('brand_header', 'story_feed', 'sidebar')),
  headline text not null check (length(trim(headline)) between 1 and 160),
  image_url text not null check (image_url like 'https://%'),
  target_url text not null check (target_url like 'https://%'),
  alt_text text not null check (length(trim(alt_text)) between 1 and 250),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index if not exists brand_ads_active_placement_idx
  on public.brand_ads (brand, placement, starts_at)
  where status = 'active';

alter table public.brand_ads enable row level security;
revoke all on table public.brand_ads from anon, authenticated;
grant select on table public.brand_ads to anon, authenticated;
grant insert, update, delete on table public.brand_ads to authenticated;

drop policy if exists "Read active ads or manage as staff" on public.brand_ads;
create policy "Read active ads or manage as staff"
on public.brand_ads
for select
to anon, authenticated
using (
  (
    status = 'active'
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  )
  or (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor')
);

drop policy if exists "Staff can insert ads" on public.brand_ads;
create policy "Staff can insert ads"
on public.brand_ads
for insert
to authenticated
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor')
  and created_by = (select auth.uid())
);

drop policy if exists "Staff can update ads" on public.brand_ads;
create policy "Staff can update ads"
on public.brand_ads
for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

drop policy if exists "Staff can delete ads" on public.brand_ads;
create policy "Staff can delete ads"
on public.brand_ads
for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'));

create or replace view public.brand_performance
with (security_invoker = true)
as
  select
    a.category as brand,
    count(*) filter (where a.status = 'published')::bigint as published_articles,
    coalesce(sum(a.view_count) filter (where a.status = 'published'), 0)::bigint as lifetime_views,
    coalesce(round(avg(a.view_count) filter (where a.status = 'published')), 0)::bigint as average_views_per_article,
    coalesce(c.comment_count, 0)::bigint as comment_count
  from public.articles a
  left join (
    select ar.category, count(ac.id)::bigint as comment_count
    from public.articles ar
    join public.article_comments ac on ac.article_id = ar.id
    where ar.status = 'published'
    group by ar.category
  ) c on c.category = a.category
  group by a.category, c.comment_count;

grant select on public.brand_performance to anon, authenticated;

commit;