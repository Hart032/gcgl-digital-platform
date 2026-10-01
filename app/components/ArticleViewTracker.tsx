'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ArticleViewTrackerProps {
  articleId: number;
}

export default function ArticleViewTracker({ articleId }: ArticleViewTrackerProps) {
  useEffect(() => {
    if (!supabase) return;

    const storageKey = `gcgl-article-view:${articleId}`;
    const lastViewedAt = Number(sessionStorage.getItem(storageKey) ?? 0);
    if (Date.now() - lastViewedAt < 30 * 60 * 1000) return;

    void supabase.rpc('increment_article_view', { p_article_id: articleId }).then(({ error }) => {
      if (error) {
        console.error('Unable to record article view:', error.message);
        return;
      }

      sessionStorage.setItem(storageKey, String(Date.now()));
    });
  }, [articleId]);

  return null;
}