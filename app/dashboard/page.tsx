'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type SubscriptionStatus = 'inactive' | 'active' | 'paused' | 'cancelled';

type PaymentRecord = {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: 'Paid' | 'Pending' | 'Refunded';
};

type DashboardFeedback = {
  message: string;
  type: 'success' | 'error';
};

const inputClassName = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600';

const demoPayments: PaymentRecord[] = [
  {
    id: 'PAY-1048',
    date: '2026-09-10',
    amount: 'GH₵25.00',
    plan: 'Premium Monthly',
    status: 'Paid',
  },
  {
    id: 'PAY-1016',
    date: '2026-08-10',
    amount: 'GH₵25.00',
    plan: 'Premium Monthly',
    status: 'Paid',
  },
  {
    id: 'PAY-983',
    date: '2026-07-10',
    amount: 'GH₵25.00',
    plan: 'Premium Monthly',
    status: 'Paid',
  },
];

export default function UserDashboardPage() {
  const [isChecking, setIsChecking] = useState(Boolean(supabase));
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewAccount, setIsPreviewAccount] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [feedback, setFeedback] = useState<DashboardFeedback | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [plan, setPlan] = useState('Premium Monthly');
  const [status, setStatus] = useState<SubscriptionStatus>('inactive');
  const [nextRenewalAt, setNextRenewalAt] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  const loadAccountDetails = async () => {
    const response = await fetch('/api/profile', { cache: 'no-store' });
    const payload = await response.json() as {
      error?: string;
      profile?: { full_name?: string; phone?: string; region?: string } | null;
      subscription?: { plan?: string; status?: string; next_renewal_at?: string | null } | null;
    };

    if (!response.ok) throw new Error(payload.error || 'Unable to load account details.');

    setFullName(payload.profile?.full_name || '');
    setPhone(payload.profile?.phone || '');
    setRegion(payload.profile?.region || '');
    setPlan(payload.subscription?.plan || 'Premium Monthly');
    setStatus((payload.subscription?.status as SubscriptionStatus) || 'inactive');
    setNextRenewalAt(payload.subscription?.next_renewal_at || null);
  };

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    const syncSession = async () => {
      const { data, error } = await client.auth.getUser();

      if (error || !data.user) {
        setSessionUser(null);
        setIsChecking(false);
        return;
      }

      setSessionUser(data.user);
      try {
        await loadAccountDetails();
      } catch (loadError) {
        setFeedback({ type: 'error', message: loadError instanceof Error ? loadError.message : 'Unable to load account details.' });
      }
      setIsChecking(false);
    };

    void syncSession();

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setSessionUser(null);
        setPaymentHistory([]);
        setNextRenewalAt(null);
        setStatus('inactive');
        setIsChecking(false);
        return;
      }

      setSessionUser(session.user);
      setIsChecking(false);
      void loadAccountDetails().catch((loadError: unknown) => {
        setFeedback({ type: 'error', message: loadError instanceof Error ? loadError.message : 'Unable to load account details.' });
      });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setFeedback({ type: 'error', message: 'Supabase is not configured.' });
      return;
    }

    setIsSigningIn(true);
    setFeedback(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setFeedback({ type: 'error', message: error.message });
      setIsSigningIn(false);
      return;
    }

    setSessionUser(data.user);
    setFeedback({ type: 'success', message: 'You are signed in.' });
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    if (isPreviewAccount) {
      setIsPreviewAccount(false);
      setSessionUser(null);
      setPaymentHistory([]);
      setNextRenewalAt(null);
      setStatus('inactive');
      setFeedback(null);
      return;
    }

    if (!supabase) return;
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);
    if (error) {
      setFeedback({ type: 'error', message: error.message });
      return;
    }
    setSessionUser(null);
    setFeedback(null);
  };

  const handleSaveProfile = async () => {
    if (!sessionUser) return;
    if (isPreviewAccount) {
      setFeedback({ type: 'success', message: 'Preview only: these changes were not saved.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone, region }),
      });
      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        setFeedback({ type: 'error', message: payload.error || 'Unable to update your profile.' });
      } else {
        setFeedback({ type: 'success', message: 'Your profile has been updated.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Unable to reach the account service. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewAccount = () => {
    setIsPreviewAccount(true);
    setSessionUser({ id: 'preview-account', email: 'ama.mensah@example.com', user_metadata: {} });
    setFullName('Ama Mensah');
    setPhone('+233 24 000 0000');
    setRegion('Greater Accra');
    setPlan('Premium Monthly');
    setStatus('active');
    setNextRenewalAt('2026-10-10T00:00:00.000Z');
    setPaymentHistory(demoPayments);
    setFeedback({ type: 'success', message: 'Preview mode is active. Changes will not be saved.' });
  };

  if (isChecking) {
    return (
      <main className="min-h-screen bg-stone-100 px-4 py-10 dark:bg-zinc-950" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded bg-gray-200 dark:bg-zinc-800" />
          <div className="h-36 rounded-xl bg-gray-200 dark:bg-zinc-800" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-xl bg-gray-200 dark:bg-zinc-800" />
            <div className="h-28 rounded-xl bg-gray-200 dark:bg-zinc-800" />
            <div className="h-28 rounded-xl bg-gray-200 dark:bg-zinc-800" />
          </div>
          <p className="text-sm text-gray-500">Loading your member dashboard...</p>
        </div>
      </main>
    );
  }

  if (!sessionUser) {
    return (
      <main className="min-h-screen bg-stone-100 px-4 py-8 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-12">
        <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:grid-cols-[1fr_0.9fr]">
          <section className="flex flex-col justify-between border-b border-gray-200 p-7 dark:border-zinc-800 sm:p-10 lg:border-b-0 lg:border-r">
            <Link href="/" className="w-fit text-sm font-bold tracking-wide text-red-700 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
              GRAPHIC COMMUNICATIONS GROUP
            </Link>
            <div className="py-12 lg:py-20">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Subscriber access</p>
              <h1 className="mt-3 max-w-lg font-serif text-4xl font-bold leading-tight sm:text-5xl">Your reading, all in one place.</h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600 dark:text-zinc-400">
                Manage your membership, review payments, and keep your account details up to date.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Trusted reporting. Member-first access.</p>
          </section>

          <section className="flex items-center p-7 sm:p-10">
            <div className="w-full max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-400">Welcome back</p>
              <h2 className="mt-2 text-2xl font-bold">Sign in to your account</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">Use the email and password connected to your subscription.</p>

              {feedback && (
                <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`mt-5 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'}`}>
                  {feedback.message}
                </div>
              )}

              <form onSubmit={handleSignIn} className="mt-7 space-y-5">
                <label className="block text-sm font-semibold">
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={inputClassName}
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className={inputClassName}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
                >
                  {isSigningIn && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  {isSigningIn ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={handlePreviewAccount}
                  className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/20 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  View demo dashboard
                </button>
              )}

              <p className="mt-6 border-t border-gray-200 pt-5 text-sm text-gray-500 dark:border-zinc-800 dark:text-zinc-400">
                Need access? <Link href="/" className="font-semibold text-red-700 underline decoration-red-300 underline-offset-4 transition hover:text-red-800 dark:text-red-400">Explore subscription options</Link> from the homepage.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const displayName = fullName || sessionUser.email?.split('@')[0] || 'Member';
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-7 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-7 sm:space-y-9">
        {isPreviewAccount && (
          <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            <span className="font-bold">Demo preview.</span> This is sample account data. Profile and subscription changes are not saved.
          </div>
        )}
        <header className="flex flex-col gap-6 border-b border-gray-300 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-red-700 font-serif text-xl font-bold text-white shadow-sm" aria-hidden="true">
              {initials}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700 dark:text-red-400">Subscriber account</p>
              <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {displayName}.</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Your membership, payments, and profile in one place.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link href="/" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600">
              Back to news
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/30 disabled:cursor-wait disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {isSigningOut && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-500 dark:border-t-zinc-900" />}
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </header>

        {feedback && (
          <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm shadow-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'}`}>
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss notification" className="rounded px-1 font-semibold opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">×</button>
          </div>
        )}

        <section aria-label="Membership overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="group rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:border-l-emerald-500 dark:bg-zinc-900">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400">Subscription status</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className={`text-2xl font-bold ${status === 'active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-zinc-200'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">{plan}</span>
            </div>
          </article>

          <article className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400">Membership</p>
            <p className="mt-3 font-serif text-2xl font-bold text-red-700 dark:text-red-400">{status === 'active' ? plan.replace(/ (Monthly|Annual)$/, '') : 'No active plan'}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{status === 'active' ? 'Full digital access' : 'Contact support to manage access'}</p>
          </article>

          <article className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400">Next renewal</p>
            <p className="mt-3 font-serif text-2xl font-bold">{nextRenewalAt ? new Date(nextRenewalAt).toLocaleDateString() : 'Not scheduled'}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Contact support to manage your plan</p>
          </article>
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section id="payments" className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 dark:text-red-400">Account activity</p>
                <h2 className="mt-1 text-xl font-bold">Payment history</h2>
              </div>
              <span className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:bg-zinc-800 dark:text-zinc-200">
                {paymentHistory.length} {paymentHistory.length === 1 ? 'transaction' : 'transactions'}
              </span>
            </div>

            {paymentHistory.length ? (
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {paymentHistory.map((payment) => (
                  <article key={payment.id} className="flex flex-col gap-3 py-4 transition-colors first:pt-0 last:pb-0 hover:bg-gray-50/80 dark:hover:bg-zinc-800/30 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{payment.plan}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{payment.id} <span aria-hidden="true">·</span> {payment.date}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="font-bold tabular-nums">{payment.amount}</p>
                      <span className={`inline-flex min-w-20 justify-center rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
                        payment.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200'
                          : payment.status === 'Pending'
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200'
                            : 'bg-red-50 text-red-800 dark:bg-red-950/70 dark:text-red-200'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-zinc-950 dark:text-zinc-400">Your payment history will appear here.</p>
            )}
          </section>

          <section id="subscription" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 dark:text-red-400">Your plan</p>
            <h2 className="mt-1 text-xl font-bold">Subscription details</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-zinc-400">Your plan and access status are managed by GCGL support to protect payment and membership records.</p>

            <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-200 px-4 dark:divide-zinc-800 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-gray-500 dark:text-zinc-400">Current plan</span>
                <span className="text-right font-semibold">{plan}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-gray-500 dark:text-zinc-400">Status</span>
                <span className="font-semibold">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </div>
            </div>
          </section>
        </section>

        <section id="profile" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex flex-col gap-2 border-b border-gray-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 dark:text-red-400">Account settings</p>
              <h2 className="mt-1 text-xl font-bold">Profile details</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Your details are saved to your subscriber account.</p>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Full name
              <input
                value={fullName}
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-semibold">
              Phone number
              <input
                value={phone}
                type="tel"
                autoComplete="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Your phone number"
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-semibold sm:col-span-2">
              Region or location
              <input
                value={region}
                autoComplete="address-level1"
                onChange={(event) => setRegion(event.target.value)}
                placeholder="Region or city"
                className={inputClassName}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-zinc-400">Signed in as {sessionUser.email}</p>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {isSaving ? 'Saving changes...' : 'Save changes'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
