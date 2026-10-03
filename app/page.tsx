'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import BreakingNewsTicker from '@/app/components/BreakingNewsTicker';
import TrendingStories from '@/app/components/TrendingStories';
import BrandAdSlot from '@/app/components/BrandAdSlot';
import { supabase } from '@/lib/supabase/client';

interface CheckoutButtonProps {
  email: string;
  amount: number;
}

// Fix ts(2769): Explicitly pass CheckoutButtonProps to dynamic import
const CheckoutButton = dynamic<CheckoutButtonProps>(
  () => import('@/app/components/CheckoutButton'),
  {
    ssr: false,
    loading: () => <p className="text-sm text-gray-400">Loading secure checkout...</p>,
  }
);

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  published_at: string;
}

const NAV_CATEGORIES = ['Politics', 'Business', 'World', 'Sports', 'Showbiz', 'GCGL TV / Video'];

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = localStorage.getItem('gcgl-theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'card'>('momo');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plan, setPlan] = useState('monthly');
  const [email, setEmail] = useState('reader@gcgl.com.gh');
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoadingArticles, setIsLoadingArticles] = useState(Boolean(supabase));
  const [articleLoadError, setArticleLoadError] = useState(
    supabase ? '' : 'News stories are unavailable because the database is not configured.'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('gcgl-theme', theme);
  }, [theme]);

  useEffect(() => {
    let isActive = true;

    async function fetchArticles() {
      if (!supabase) {
        console.warn('Supabase is not configured.');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false });

        if (!isActive) return;

        if (error) {
          console.error('Error fetching articles:', error.message);
          setArticleLoadError('News stories could not be loaded. Please try again later.');
        } else {
          setArticles(data || []);
          setArticleLoadError('');
        }
      } catch (error: unknown) {
        console.error('Error fetching articles:', error);
        setArticleLoadError('News stories could not be loaded. Please try again later.');
      } finally {
        if (isActive) setIsLoadingArticles(false);
      }
    }

    void fetchArticles();

    return () => {
      isActive = false;
    };
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setPhoneNumber('');
  };

  const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = newsletterEmail.trim();

    if (!trimmedEmail) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please enter a valid email address.');
      return;
    }

    setNewsletterStatus('loading');
    setNewsletterMessage('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setNewsletterStatus('error');
        setNewsletterMessage(payload.error || 'We could not save your subscription right now.');
        return;
      }

      setNewsletterStatus('success');
      setNewsletterMessage(payload.message || 'Thanks for joining! Your daily digest signup is confirmed.');
      setNewsletterEmail('');
    } catch (error) {
      setNewsletterStatus('error');
      setNewsletterMessage(error instanceof Error ? error.message : 'We could not process your signup.');
    }
  };

  const categoryOptions = Array.from(
    new Set(articles.map((article) => article.category.trim()).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second));
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredArticles = articles.filter((article) => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const searchableText = `${article.title} ${article.category} ${article.content}`.toLocaleLowerCase();
    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
  const featuredArticle = filteredArticles[0] ?? null;
  const secondaryArticles = filteredArticles.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 relative" suppressHydrationWarning>
      
      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
              Thursday, October 1, 2026
            </span>
            <span className="hidden rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 sm:inline-block dark:bg-red-950 dark:text-red-300">
              LIVE DATABASE CONNECTED
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/epaper" className="hover:text-red-600">E-Paper</Link>
            <Link href="/dashboard" className="hover:text-red-600">Dashboard</Link>
            <button
              type="button"
              aria-label="Toggle dark mode"
              onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
              className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-700 transition"
            >
              Subscribe
            </button>
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="border-b border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl font-serif text-red-700 dark:text-red-500">
            GRAPHIC COMMUNICATIONS GROUP
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-gray-500 dark:text-zinc-400">
            Truth | Accuracy | Service — Supabase Powered Platform
          </p>
        </div>
        <div className="flex justify-start gap-6 overflow-x-auto border-t border-gray-100 px-4 py-3 text-sm font-semibold uppercase tracking-wider md:justify-center dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            aria-pressed={selectedCategory === 'all'}
            className={`shrink-0 ${selectedCategory === 'all' ? 'text-red-600' : 'hover:text-red-600'}`}
          >
            Home
          </button>
          {NAV_CATEGORIES.map((navCategory) => (
            <button
              key={navCategory}
              type="button"
              onClick={() => setSelectedCategory(navCategory)}
              aria-pressed={selectedCategory === navCategory}
              className={`shrink-0 ${selectedCategory === navCategory ? 'text-red-600' : 'hover:text-red-600'}`}
            >
              {navCategory}
            </button>
          ))}
          <Link href="/tv" className="shrink-0 hover:text-red-600">GCGL TV</Link>
        </div>
      </nav>

      {/* MAIN CONTENT GRID */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BreakingNewsTicker />

        <section aria-label="Search and filter articles" className="mb-8 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Search articles</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search headlines, topics, or article text"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm sm:w-56 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500" aria-live="polite">
            {isLoadingArticles
              ? 'Loading published stories...'
              : articleLoadError || `Showing ${filteredArticles.length} of ${articles.length} published stories`}
          </p>
        </section>

        {selectedCategory !== 'all' && (
          <div className="mb-8">
            <BrandAdSlot brand={selectedCategory} placement="brand_header" />
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-white to-red-50 p-6 shadow-sm dark:border-red-900/70 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Daily digest</p>
              <h2 className="mt-2 text-2xl font-bold">Join the GCGL newsletter</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                Get the top stories, analysis, and curated updates delivered to your inbox each morning.
              </p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="Your email address"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                aria-label="Email address"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="rounded-md bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {newsletterStatus === 'loading' ? 'Joining...' : 'Join newsletter'}
              </button>
            </form>
          </div>

          {newsletterMessage && (
            <p className={`mt-4 text-sm ${newsletterStatus === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-600'}`}>
              {newsletterMessage}
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          <div className="lg:col-span-2 space-y-8">
            {isLoadingArticles ? (
              <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-zinc-900">
                <p className="text-sm text-gray-500">Loading published stories...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-zinc-900">
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  {articleLoadError || (articles.length === 0
                    ? 'No published stories are available yet.'
                    : 'No stories match your search or category.')}
                </p>
              </div>
            ) : featuredArticle ? (
              <Link href={`/articles/preview/${featuredArticle.id}`} className="group block overflow-hidden rounded-lg bg-white shadow-md dark:bg-zinc-900 dark:border dark:border-zinc-800">
                <div className="h-64 w-full bg-gray-300 dark:bg-zinc-800 flex items-center justify-center text-gray-500 font-medium">
                  {featuredArticle.image_url ? (
                    <Image
                      src={featuredArticle.image_url}
                      alt={featuredArticle.title}
                      width={1200}
                      height={800}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    '[Supabase Live Image Placeholder]'
                  )}
                </div>
                <div className="p-6">
                  <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                    {featuredArticle.category}
                  </span>
                  <h2 className="mt-2 text-2xl font-bold group-hover:text-red-600 sm:text-3xl">
                    {featuredArticle.title}
                  </h2>
                  <p className="mt-3 text-sm text-gray-600 dark:text-zinc-400">
                    {featuredArticle.content}
                  </p>

                  {featuredArticle.video_url && (
                    <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg bg-black">
                      <iframe
                        src={featuredArticle.video_url.includes('watch?v=') 
                          ? featuredArticle.video_url.replace('watch?v=', 'embed/') 
                          : featuredArticle.video_url}
                        title={featuredArticle.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  <div className="mt-4 flex items-center text-xs text-gray-500">
                    <span>Published: {featuredArticle.published_at ? new Date(featuredArticle.published_at).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : ''}</span>
                  </div>
                </div>
              </Link>
            ) : null}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {secondaryArticles.map((art) => (
                <Link key={art.id} href={`/articles/preview/${art.id}`} className="group block rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800">
                  <span className="text-xs font-semibold text-blue-600 uppercase">{art.category}</span>
                  <h3 className="mt-1 font-bold group-hover:text-red-600 text-sm">
                    {art.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">{art.content}</p>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <TrendingStories />
            <div className="rounded-lg bg-zinc-900 text-white p-6 shadow-md dark:bg-zinc-800">
              <h3 className="text-base font-bold">Get Full Digital Access</h3>
              <p className="mt-2 text-xs text-zinc-300">
                Unlock unrestricted access to the Graphic NewsPlus app and live database sync.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 w-full rounded bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
              >
                Subscribe via Mobile Money / Card
              </button>
            </div>
          </aside>

        </div>
      </main>

      {/* CHECKOUT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900 dark:border dark:border-zinc-800 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold">✕</button>

            <div>
              <h3 className="text-xl font-bold mb-4">Secure Digital Checkout</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Choose Plan</label>
                  <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700">
                    <option value="monthly">Monthly Pass — GH₵ 50 / mo</option>
                    <option value="annual">Annual Pass — GH₵ 500 / yr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPaymentMethod('momo')} className={`py-2 text-xs font-semibold rounded-lg border ${paymentMethod === 'momo' ? 'border-red-600 bg-red-50 text-red-700 dark:bg-zinc-800' : ''}`}>Mobile Money</button>
                    <button type="button" onClick={() => setPaymentMethod('card')} className={`py-2 text-xs font-semibold rounded-lg border ${paymentMethod === 'card' ? 'border-red-600 bg-red-50 text-red-700 dark:bg-zinc-800' : ''}`}>Card</button>
                  </div>
                </div>
                {paymentMethod === 'momo' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Mobile Money Number</label>
                    <input type="text" required placeholder="e.g. 024XXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700" />
                  </div>
                )}
                
                <div className="pt-2">
                  <CheckoutButton email={email} amount={plan === 'monthly' ? 50 : 500} />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-500 dark:bg-zinc-900">
        <p>© 2026 Graphic Communications Group Limited. Powered by Supabase, Paystack & Next.js.</p>
      </footer>
    </div>
  );
}