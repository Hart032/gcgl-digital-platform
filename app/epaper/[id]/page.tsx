import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasAdminRole } from '@/lib/supabase';

interface EpaperReaderProps {
  params: Promise<{ id: string }>;
}

type PublicIssue = {
  id: string;
  title: string;
  issue_date: string;
  edition: string;
  status: 'draft' | 'published';
};

export default async function EpaperReaderPage({ params }: EpaperReaderProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: claimsResult } = await supabase.auth.getClaims();
  const claims = claimsResult?.claims;
  const userId = typeof claims?.sub === 'string' ? claims.sub : null;
  const isAdmin = hasAdminRole(claims ?? null);

  let issueQuery = supabase
    .from('epaper_issues')
    .select('id, title, issue_date, edition, status')
    .eq('id', id);
  if (!isAdmin) issueQuery = issueQuery.eq('status', 'published');

  const { data, error } = await issueQuery.maybeSingle();
  if (error || !data) notFound();
  const issue = data as PublicIssue;

  let canRead = isAdmin;
  if (userId && !isAdmin) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, next_renewal_at')
      .eq('user_id', userId)
      .maybeSingle();

    canRead = subscription?.status === 'active' &&
      (!subscription.next_renewal_at || new Date(subscription.next_renewal_at).getTime() > new Date().getTime());
  }

  let pdfUrl: string | null = null;
  let readerError = false;
  if (canRead) {
    const { data: privateIssue, error: pathError } = await supabase
      .from('epaper_issues')
      .select('pdf_storage_path')
      .eq('id', issue.id)
      .maybeSingle();

    if (pathError || !privateIssue) {
      readerError = true;
    } else {
      const { data: signedFile, error: signedError } = await supabase.storage
        .from('epaper')
        .createSignedUrl(privateIssue.pdf_storage_path, 1800);
      if (signedError || !signedFile) readerError = true;
      else pdfUrl = signedFile.signedUrl;
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 pb-4 dark:border-zinc-800">
          <div className="min-w-0">
            <Link href="/epaper" className="text-xs font-semibold text-red-700 hover:text-red-800 dark:text-red-400">← All editions</Link>
            <h1 className="mt-2 truncate font-serif text-2xl font-bold sm:text-3xl">{issue.title}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {issue.edition} <span aria-hidden="true">·</span> {new Date(`${issue.issue_date}T00:00:00`).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link href="/dashboard" className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold transition hover:border-gray-400 dark:border-zinc-700 dark:bg-zinc-900">
            Account
          </Link>
        </div>

        {pdfUrl ? (
          <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <iframe title={`${issue.title} digital newspaper`} src={pdfUrl} className="h-[calc(100vh-150px)] min-h-[560px] w-full bg-white" />
          </div>
        ) : readerError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
            <h2 className="font-bold">This issue is temporarily unavailable</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Please try again shortly or contact support.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-xl border-y border-gray-300 py-12 text-center dark:border-zinc-800">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700 dark:text-red-400">Subscriber edition</p>
            <h2 className="mt-3 font-serif text-2xl font-bold">Read the full newspaper</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
              {userId ? 'An active subscription is required to open this issue.' : 'Sign in with an active subscription to open this issue.'}
            </p>
            <Link href="/dashboard" className="mt-6 inline-flex rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800">
              {userId ? 'View subscription' : 'Sign in to continue'}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}