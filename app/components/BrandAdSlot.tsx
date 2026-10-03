'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';

type BrandAd = {
  id: string;
  headline: string;
  image_url: string;
  target_url: string;
  alt_text: string;
};

interface BrandAdSlotProps {
  brand: string;
  placement?: 'brand_header' | 'story_feed' | 'sidebar';
}

export default function BrandAdSlot({ brand, placement = 'story_feed' }: BrandAdSlotProps) {
  const [ad, setAd] = useState<BrandAd | null>(null);

  useEffect(() => {
    if (!supabase || !brand) return;

    let active = true;
    void supabase
      .from('brand_ads')
      .select('id, headline, image_url, target_url, alt_text')
      .eq('brand', brand)
      .eq('placement', placement)
      .eq('status', 'active')
      .lte('starts_at', new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Unable to load brand advertisement:', error.message);
          return;
        }
        setAd(data);
      });

    return () => {
      active = false;
    };
  }, [brand, placement]);

  if (!ad) return null;

  return (
    <aside aria-label="Sponsored content" className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-zinc-900">
      <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="group block">
        <div className="relative aspect-[16/5] min-h-32 bg-gray-100 dark:bg-zinc-800">
          <Image src={ad.image_url} alt={ad.alt_text} fill unoptimized sizes="100vw" className="object-cover transition duration-300 group-hover:scale-[1.01]" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">Sponsored</span>
            <p className="mt-1 font-semibold text-gray-900 dark:text-zinc-100">{ad.headline}</p>
          </div>
          <span aria-hidden="true" className="text-xl text-red-700 dark:text-red-400">↗</span>
        </div>
      </a>
    </aside>
  );
}
