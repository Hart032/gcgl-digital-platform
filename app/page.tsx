'use client'; // Tells Next.js this component handles browser interactivity

import React, { useState } from 'react';

export default function Home() {
  // State to control whether the subscription modal is open or closed
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to track selected payment method ('momo' or 'card')
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'card'>('momo');
  // State to track checkout status ('idle', 'processing', 'success')
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  // Form input states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plan, setPlan] = useState('monthly');

  // Handle checkout form submission
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStatus('processing');
    
    // Simulate secure network transaction delay (2 seconds)
    setTimeout(() => {
      setCheckoutStatus('success');
    }, 2000);
  };

  // Reset modal state when closing
  const closeModal = () => {
    setIsModalOpen(false);
    setCheckoutStatus('idle');
    setPhoneNumber('');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 relative">
      
      {/* 1. TOP UTILITY / BRAND HEADER */}
      <header className="border-b border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
              Tuesday, September 29, 2026
            </span>
            <span className="hidden rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 sm:inline-block dark:bg-red-950 dark:text-red-300">
              LIVE UPDATES
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm font-medium">
            <a href="#" className="hover:text-red-600">E-Paper</a>
            <a href="#" className="hover:text-red-600">Archived Editions</a>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-700 transition"
            >
              Subscribe
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LOGO & NAVIGATION */}
      <nav className="border-b border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl font-serif text-red-700 dark:text-red-500">
            GRAPHIC COMMUNICATIONS GROUP
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-gray-500 dark:text-zinc-400">
            Truth | Accuracy | Service — Digital-First Platform
          </p>
        </div>
        <div className="flex justify-center space-x-6 overflow-x-auto border-t border-gray-100 py-3 text-sm font-semibold uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-900">
          <a href="#" className="text-red-600 hover:text-red-700">Home</a>
          <a href="#" className="hover:text-red-600">Politics</a>
          <a href="#" className="hover:text-red-600">Business</a>
          <a href="#" className="hover:text-red-600">World</a>
          <a href="#" className="hover:text-red-600">Sports</a>
          <a href="#" className="hover:text-red-600">Showbiz</a>
          <a href="#" className="hover:text-red-600">Opinion</a>
        </div>
      </nav>

      {/* 3. BREAKING NEWS TICKER */}
      <div className="bg-red-600 text-white">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-2 text-xs sm:px-6 lg:px-8">
          <span className="font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded mr-3">
            Breaking
          </span>
          <p className="truncate">
            GCGL Executive Management announces strategic roadmap for digital integration and public stock listing...
          </p>
        </div>
      </div>

      {/* 4. MAIN NEWS GRID CONTAINER */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Left / Center: Main Feature & Grid */}
          <div className="lg:col-span-2 space-y-8">
            <article className="group cursor-pointer overflow-hidden rounded-lg bg-white shadow-md dark:bg-zinc-900 dark:border dark:border-zinc-800">
              <div className="h-64 w-full bg-gray-300 dark:bg-zinc-800 flex items-center justify-center text-gray-500">
                [Featured Hero Image Placeholder]
              </div>
              <div className="p-6">
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">National Development</span>
                <h2 className="mt-2 text-2xl font-bold group-hover:text-red-600 sm:text-3xl">
                  Transforming Ghana’s Media Ecosystem: Inside the Digital-First Strategy
                </h2>
                <p className="mt-3 text-sm text-gray-600 dark:text-zinc-400">
                  Comprehensive review of operational milestones, cloud architecture transitions, and automated newsroom publishing workflows designed to secure long-term stability.
                </p>
                <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-zinc-500">
                  <span>Published 2 hours ago</span>
                  <span className="mx-2">•</span>
                  <span>4 min read</span>
                </div>
              </div>
            </article>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <article className="group cursor-pointer rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800">
                <div className="h-36 w-full bg-gray-200 dark:bg-zinc-800 rounded mb-3 flex items-center justify-center text-xs text-gray-400">
                  [Image]
                </div>
                <span className="text-xs font-semibold text-blue-600 uppercase">Business & Finance</span>
                <h3 className="mt-1 font-bold group-hover:text-red-600">
                  Stock Exchange Listings and Capital Raising: What It Means for Institutional Investors
                </h3>
              </article>

              <article className="group cursor-pointer rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800">
                <div className="h-36 w-full bg-gray-200 dark:bg-zinc-800 rounded mb-3 flex items-center justify-center text-xs text-gray-400">
                  [Image]
                </div>
                <span className="text-xs font-semibold text-green-600 uppercase">Technology</span>
                <h3 className="mt-1 font-bold group-hover:text-red-600">
                  Cloud Migration & Infrastructure Upgrades Completed for Regional Hubs
                </h3>
              </article>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">
                Listen on the Go
              </h3>
              <div className="mt-4 flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                  ▶
                </div>
                <div>
                  <p className="text-xs font-semibold">Daily Bulletin Podcast</p>
                  <p className="text-xs text-gray-500">Duration: 4 mins</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-900 text-white p-6 shadow-md dark:bg-zinc-800">
              <h3 className="text-base font-bold">Get Full Digital Access</h3>
              <p className="mt-2 text-xs text-zinc-300">
                Unlock unrestricted access to the Graphic NewsPlus app, complete historical archives, and ad-free browsing.
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

      {/* 5. INTERACTIVE CHECKOUT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900 dark:border dark:border-zinc-800 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-lg font-bold"
            >
              ✕
            </button>

            {checkoutStatus === 'success' ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Subscription Successful!</h3>
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  Your payment has been processed. Check your email and phone for your Graphic NewsPlus activation keys.
                </p>
                <button 
                  onClick={closeModal}
                  className="mt-4 w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
                >
                  Return to Portal
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Secure Digital Checkout</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  Select your subscription plan and preferred local or international payment gateway.
                </p>

                <form onSubmit={handleCheckout} className="mt-6 space-y-4">
                  
                  {/* Plan Selector */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                      Choose Plan
                    </label>
                    <select 
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    >
                      <option value="monthly">Monthly Pass — GH₵ 50 / mo</option>
                      <option value="diaspora">Diaspora Digital Annual — $60 / yr</option>
                      <option value="corporate">Corporate Multi-User License — GH₵ 500 / mo</option>
                    </select>
                  </div>

                  {/* Payment Method Tabs */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('momo')}
                        className={`py-2 text-xs font-semibold rounded-lg border transition ${
                          paymentMethod === 'momo'
                            ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                            : 'border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        Mobile Money (MTN / Vodafone)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`py-2 text-xs font-semibold rounded-lg border transition ${
                          paymentMethod === 'card'
                            ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                            : 'border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        Credit / Debit Card
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Inputs Based on Method */}
                  {paymentMethod === 'momo' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                        Mobile Money Number
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. 024XXXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                      />
                      <p className="mt-1 text-[10px] text-gray-500">A payment prompt will be sent to your phone.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Card Number</label>
                        <input type="text" required placeholder="4242 •••• •••• ••••" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" required placeholder="MM / YY" className="rounded-lg border border-gray-300 p-2.5 text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
                        <input type="password" required placeholder="CVV" className="rounded-lg border border-gray-300 p-2.5 text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
                      </div>
                    </div>
                  )}

                  {/* Submit Button with Loading State */}
                  <button 
                    type="submit"
                    disabled={checkoutStatus === 'processing'}
                    className="mt-4 w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {checkoutStatus === 'processing' ? (
                      <span>Processing Transaction...</span>
                    ) : (
                      <span>Complete Secure Payment</span>
                    )}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 6. FOOTER */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <p>© 2026 Graphic Communications Group Limited. All rights reserved.</p>
        <p className="mt-1">Interactive Frontend Prototype with Simulated Payment Gateway Integration</p>
      </footer>

    </div>
  );
}