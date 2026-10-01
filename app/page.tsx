'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

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

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'card'>('momo');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plan, setPlan] = useState('monthly');
  const [email, setEmail] = useState('reader@gcgl.com.gh');
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    async function fetchArticles() {
      if (!supabase) {
        console.warn('Supabase is not configured.');
        return;
      }

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error.message);
      } else if (data) {
        setArticles(data);
      }
    }

    fetchArticles();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setPhoneNumber('');
  };

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const secondaryArticles = articles.length > 1 ? articles.slice(1) : [];

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
          <div className="flex items-center space-x-4 text-sm font-medium">
            <a href="#" className="hover:text-red-600">E-Paper</a>
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
        <div className="flex justify-center space-x-6 overflow-x-auto border-t border-gray-100 py-3 text-sm font-semibold uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-900">
          <a href="#" className="text-red-600">Home</a>
          <a href="#" className="hover:text-red-600">Politics</a>
          <a href="#" className="hover:text-red-600">Business</a>
          <a href="#" className="hover:text-red-600">World</a>
          <a href="#" className="hover:text-red-600">Sports</a>
          <a href="#" className="hover:text-red-600">Showbiz</a>
          <a href="#" className="hover:text-red-600">GCGL TV / Video</a>
        </div>
      </nav>

      {/* MAIN CONTENT GRID */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          <div className="lg:col-span-2 space-y-8">
            {featuredArticle ? (
              <article className="group cursor-pointer overflow-hidden rounded-lg bg-white shadow-md dark:bg-zinc-900 dark:border dark:border-zinc-800">
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
              </article>
            ) : (
              <div className="p-8 text-center bg-white rounded-lg shadow dark:bg-zinc-900">
                <p className="text-sm text-gray-500">Loading live articles from Supabase database...</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {secondaryArticles.map((art) => (
                <article key={art.id} className="group cursor-pointer rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800">
                  <span className="text-xs font-semibold text-blue-600 uppercase">{art.category}</span>
                  <h3 className="mt-1 font-bold group-hover:text-red-600 text-sm">
                    {art.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">{art.content}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
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