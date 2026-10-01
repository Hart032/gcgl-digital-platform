import { createSupabaseServerClient } from '@/lib/supabase/server';
import { siteUrl } from '@/app/lib/site';

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: articles, error } = supabase
    ? await supabase
        .from('articles')
        .select('id, title, content, category, published_at, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50)
    : { data: [], error: null };

  if (error) {
    console.error('Unable to load articles for RSS feed:', error.message);
  }

  const items = (articles ?? []).map((article) => {
    const link = `${siteUrl.origin}/articles/preview/${article.id}`;
    const description = (article.content ?? '').slice(0, 500);
    const publishedAt = article.published_at || article.created_at;

    return `<item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(article.category || 'General')}</category>
      <description>${escapeXml(description)}</description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Graphic Communications Group</title>
    <link>${escapeXml(siteUrl.origin)}</link>
    <description>Latest news, reporting, and analysis from Graphic Communications Group.</description>
    <language>en-GH</language>
    <atom:link href="${escapeXml(`${siteUrl.origin}/feed.xml`)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}