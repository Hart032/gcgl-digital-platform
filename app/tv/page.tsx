import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import VideoPost from '@/app/components/VideoPost';

type VideoArticle = {
  id: number;
  title: string;
  category: string;
  content: string;
  video_url: string;
  video_provider: string | null;
  published_at: string;
};

function getPublicVideoUrl(client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, pathOrUrl: string) {
  if (pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('http://')) return pathOrUrl;
  return client.storage.from('media').getPublicUrl(pathOrUrl).data.publicUrl;
}

export default async function GcglTvPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-red-700">GCGL TV is temporarily unavailable.</main>;
  }

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, category, content, video_url, video_provider, published_at')
    .eq('status', 'published')
    .eq('post_type', 'video')
    .not('video_url', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) console.error('Unable to load GCGL TV videos:', error.message);
  const videos = (data as VideoArticle[] | null) ?? [];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border-b border-gray-300 pb-5 dark:border-zinc-800">
          <Link href="/" className="text-xs font-bold uppercase tracking-[0.16em] text-red-700 dark:text-red-400">Graphic Communications Group</Link>
          <h1 className="mt-3 font-serif text-4xl font-bold">GCGL TV</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Video reports and stories from across our newsroom.</p>
        </header>

        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">Videos could not be loaded. Apply the platform features migration and try again.</p>
        ) : videos.length === 0 ? (
          <p className="border-y border-gray-300 py-12 text-center text-gray-500 dark:border-zinc-800 dark:text-zinc-400">No published videos yet.</p>
        ) : (
          <section aria-label="Latest video reports" className="grid gap-6 md:grid-cols-2">
            {videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="[&_video]:my-0 [&_video]:aspect-video [&_video]:max-h-none [&_video]:w-full [&_iframe]:my-0 [&_iframe]:aspect-video">
                  <VideoPost src={getPublicVideoUrl(supabase, video.video_url)} title={video.title} provider={video.video_provider} />
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400">{video.category}</p>
                  <h2 className="font-serif text-xl font-bold">{video.title}</h2>
                  <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{video.content}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">{new Date(video.published_at).toLocaleDateString()}</p>
                  <Link href={`/articles/preview/${video.id}`} className="inline-flex pt-1 text-sm font-semibold text-red-700 hover:underline dark:text-red-400">Open story →</Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
