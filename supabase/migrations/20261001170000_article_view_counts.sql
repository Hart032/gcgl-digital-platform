begin;

alter table public.articles
  add column if not exists view_count bigint not null default 0;

create index if not exists articles_published_view_count_idx
  on public.articles (view_count desc, published_at desc)
  where status = 'published';

create or replace function public.increment_article_view(p_article_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_view_count bigint;
begin
  update public.articles
  set view_count = public.articles.view_count + 1
  where public.articles.id = p_article_id
    and public.articles.status = 'published'
  returning view_count into updated_view_count;

  return updated_view_count;
end;
$$;

revoke all on function public.increment_article_view(bigint) from public;
grant execute on function public.increment_article_view(bigint) to anon, authenticated;

commit;