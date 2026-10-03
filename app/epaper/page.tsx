import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type EpaperIssue = {
  id: string;
  title: string;
  issue_date: string;
  edition: string;
  brand: string;
  cover_image_url: string | null;
};

export default async function EpaperArchivePage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <main className="mx-auto max-w-6xl px-4 py-12 text-sm text-red-700">E-Paper is temporarily unavailable.</main>;
  }

  const { data, error } = await supabase
    .from('epaper_issues')
    .select('id, title, issue_date, edition, brand, cover_image_url')
    .eq('status', 'published')
    .order('issue_date', { ascending: false })
    .limit(48);

  const issues = (data as EpaperIssue[] | null) ?? [];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 pb-5 dark:border-zinc-800">
          <div>
            <Link href="/" className="text-xs font-bold uppercase tracking-[0.16em] text-red-700 hover:text-red-800 dark:text-red-400">Graphic Communications Group</Link>
            <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">The E-Paper</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-zinc-400">Read the digital edition of the newspaper, wherever you are.</p>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-gray-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            Subscriber account
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            We couldn’t load the E-Paper archive. Please try again shortly.
          </p>
        ) : issues.length === 0 ? (
          <div className="mt-8 border-y border-gray-300 py-12 text-center dark:border-zinc-800">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 dark:text-red-400">Digital editions</p>
            <h2 className="mt-2 font-serif text-2xl font-bold">The first issue is on its way</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">Published editions will appear here.</p>
          </div>
        ) : (
          <section aria-label="Published editions" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {issues.map((issue) => (
              <Link key={issue.id} href={`/epaper/${issue.id}`} className="group min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative aspect-[3/4] overflow-hidden bg-red-950">
                  {issue.cover_image_url ? (
                    <Image src={issue.cover_image_url} alt={`${issue.title} cover`} fill unoptimized sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,#7f1d1d_0%,#450a0a_70%,#18181b_100%)] p-4 text-white sm:p-5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-100">{issue.brand} · {issue.edition}</span>
                      <span className="font-serif text-xl font-bold leading-tight sm:text-2xl">{issue.title}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <p className="truncate text-sm font-bold group-hover:text-red-700 dark:group-hover:text-red-400">{issue.title}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-zinc-400">{issue.brand} · {issue.edition}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    {new Date(`${issue.issue_date}T00:00:00`).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <span className="mt-3 inline-flex text-xs font-semibold text-red-700 dark:text-red-400">Open edition <span aria-hidden="true" className="ml-1">→</span></span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}