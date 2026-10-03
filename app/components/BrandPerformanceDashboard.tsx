'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type PerformanceRow = {
  brand: string;
  published_articles: number;
  lifetime_views: number;
  average_views_per_article: number;
  comment_count: number;
};

export default function BrandPerformanceDashboard() {
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .from('brand_performance')
      .select('brand, published_articles, lifetime_views, average_views_per_article, comment_count')
      .order('lifetime_views', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) {
          console.error('Unable to load brand performance:', queryError.message);
          setError('Could not load brand performance. Apply the platform features migration and retry.');
        } else {
          const performance = (data as PerformanceRow[]) ?? [];
          setRows(performance);
          setSelectedBrand((current) => current || performance[0]?.brand || '');
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(
    () => rows.find((row) => row.brand === selectedBrand) ?? null,
    [rows, selectedBrand]
  );

  return (
    <section aria-labelledby="brand-performance-title" className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 dark:text-red-400">Analytics</p>
          <h2 id="brand-performance-title" className="mt-1 text-xl font-bold">Brand performance</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Published stories, lifetime views, and reader comments.</p>
        </div>
        <label className="text-sm font-semibold">
          Brand
          <select
            value={selectedBrand}
            onChange={(event) => setSelectedBrand(event.target.value)}
            disabled={loading || rows.length === 0}
            className="mt-1 block min-w-52 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {rows.map((row) => <option key={row.brand} value={row.brand}>{row.brand}</option>)}
          </select>
        </label>
      </div>

      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> :
        loading ? <p className="text-sm text-gray-500">Loading metrics...</p> :
          !selected ? <p className="text-sm text-gray-500">No article metrics are available yet.</p> : (
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Published articles', selected.published_articles],
                ['Lifetime views', selected.lifetime_views],
                ['Average views per story', selected.average_views_per_article],
                ['Comments', selected.comment_count],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-950">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">{label}</dt>
                  <dd className="mt-2 text-2xl font-bold tabular-nums">{Number(value).toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          )}
    </section>
  );
}
