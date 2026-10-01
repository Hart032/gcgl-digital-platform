import type { MetadataRoute } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { siteUrl } from '@/app/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl.origin,
      changeFrequency: 'hourly',
      priority: 1,
    },
  ];

  const supabase = await createSupabaseServerClient();
  if (!supabase) return staticRoutes;

  const [articlesResult, issuesResult] = await Promise.all([
    supabase
      .from('articles')
      .select('id, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase
      .from('epaper_issues')
      .select('id, issue_date, published_at')
      .eq('status', 'published')
      .order('issue_date', { ascending: false }),
  ]);

  if (articlesResult.error) console.error('Unable to load articles for sitemap:', articlesResult.error.message);
  if (issuesResult.error) console.error('Unable to load E-Paper issues for sitemap:', issuesResult.error.message);

  return [
    ...staticRoutes,
    ...(articlesResult.data ?? []).map((article) => ({
      url: `${siteUrl.origin}/articles/preview/${article.id}`,
      lastModified: article.published_at || article.created_at,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...(issuesResult.data ?? []).map((issue) => ({
      url: `${siteUrl.origin}/epaper/${issue.id}`,
      lastModified: issue.published_at || issue.issue_date,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}