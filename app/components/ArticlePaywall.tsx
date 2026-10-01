'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const CheckoutButton = dynamic(
  () => import('@/app/components/CheckoutButton'),
  {
    ssr: false,
    loading: () => <p className="text-sm text-gray-400">Loading secure checkout...</p>,
  }
);

interface ArticlePaywallProps {
  content: string;
  title: string;
}

export default function ArticlePaywall({ content, title }: ArticlePaywallProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('gcgl_premium_access') === 'true';
  });

  const sections = useMemo(
    () =>
      content
        .split(/\n{2,}|\n/)
        .map((section) => section.trim())
        .filter(Boolean),
    [content]
  );

  const previewSections = sections.slice(0, 2);
  const lockedSections = sections.slice(2);

  const unlockAccess = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcgl_premium_access', 'true');
    }
    setIsUnlocked(true);
  };

  if (isUnlocked) {
    return (
      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-zinc-300">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-zinc-300">
        {previewSections.join('\n\n')}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/50">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
          Member access required
        </p>
        <h3 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">Continue reading this story</h3>
        <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300">
          Free readers can preview the opening paragraphs. Complete a subscription to unlock the rest of {title}.
        </p>

        <div className="mt-4">
          <CheckoutButton
            email="reader@gcgl.com.gh"
            amount={25}
            onSuccess={() => unlockAccess()}
            onClose={() => undefined}
          />
        </div>
      </div>

      {lockedSections.length > 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
          Remaining article content is hidden until subscription is completed.
        </div>
      )}
    </div>
  );
}
