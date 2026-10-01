'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface TrendingArticle {
  id: string;
  title: string;
  view_count: number;
}

export default function TrendingStories() {
  const [articles, setArticles] = useState<TrendingArticle[]>([]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let isActive = true;

    const fetchTrendingStories = async () => {
      const { data, error } = await client
        .from('articles')
        .select('id, title, view_count')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(5);

      if (!isActive) return;
      if (error) {
        console.error('Unable to load trending stories:', error.message);
        return;
      }

      setArticles((data as TrendingArticle[]) ?? []);
    };

    void fetchTrendingStories();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="trending-stories-heading">
      <h2 id="trending-stories-heading" className="border-b border-gray-200 pb-3 text-base font-bold dark:border-zinc-800">
        Trending Stories
      </h2>
      {articles.length > 0 ? (
        <ol className="divide-y divide-gray-100 dark:divide-zinc-800">
          {articles.map((article, index) => (
            <li key={article.id} className="py-3 last:pb-0">
              <Link href={`/articles/preview/${article.id}`} className="flex gap-3 hover:text-red-600">
                <span className="text-lg font-bold text-red-600">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug">{article.title}</span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-zinc-400">
                    {article.view_count.toLocaleString()} reads
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="pt-3 text-sm text-gray-500 dark:text-zinc-400">No readership data yet.</p>
      )}
    </section>
  );
}