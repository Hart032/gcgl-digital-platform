'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type BreakingNewsItem = {
  id: string;
  headline: string;
  created_at: string;
};

export default function BreakingNewsTicker() {
  const [items, setItems] = useState<BreakingNewsItem[]>([]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const loadInitial = async () => {
      const { data, error } = await client
        .from('breaking_news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error) {
        setItems((data as BreakingNewsItem[]) ?? []);
      }
    };

    void loadInitial();

    const channel = client
      .channel('breaking_news_ticker')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'breaking_news' },
        (payload) => {
          const incoming = payload.new as BreakingNewsItem;
          setItems((current) => [incoming, ...current].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-red-200 bg-red-50 text-red-900 shadow-sm dark:border-red-900 dark:bg-red-950/60 dark:text-red-100">
      <div className="flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-600"></span>
        Breaking News
      </div>
      <div className="relative overflow-hidden border-t border-red-200 dark:border-red-800">
        <div className="animate-[marquee_20s_linear_infinite] whitespace-nowrap py-3 px-4 text-sm font-medium">
          {items.map((item) => (
            <span key={item.id} className="mx-6">
              {item.headline}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
