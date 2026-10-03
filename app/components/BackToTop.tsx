'use client';

import { useEffect, useState } from 'react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 480);
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => {
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth';
        window.scrollTo({ top: 0, behavior });
      }}
      className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-red-700 text-xl font-bold text-white shadow-lg transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40"
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
