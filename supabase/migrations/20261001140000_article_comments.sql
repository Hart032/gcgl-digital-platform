begin;

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id bigint not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Reader',
  comment text not null check (length(trim(comment)) > 0),
  created_at timestamptz not null default now()
);

alter table public.article_comments enable row level security;

create index if not exists article_comments_article_idx
  on public.article_comments (article_id, created_at desc);

drop policy if exists "Anyone can view article comments" on public.article_comments;
create policy "Anyone can view article comments"
on public.article_comments
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can post comments" on public.article_comments;
create policy "Authenticated users can post comments"
on public.article_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own comments" on public.article_comments;
create policy "Users can update their own comments"
on public.article_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.article_comments;
create policy "Users can delete their own comments"
on public.article_comments
for delete
to authenticated
using (auth.uid() = user_id);

commit;
