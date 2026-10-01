import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasEditorRole } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ArticleComments from '@/app/components/ArticleComments';
import ArticlePaywall from '@/app/components/ArticlePaywall';
import ArticleViewTracker from '@/app/components/ArticleViewTracker';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PreviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Helper to resolve media URLs if stored as relative paths in buckets ('images/...' or 'videos/...')
const getPublicMediaUrl = (supabase: SupabaseClient, pathOrUrl: string | null) => {
  if (!pathOrUrl) return null;
  // If it's already a full URL (http/https or blob), return as is
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl;
  }
  // Otherwise, fetch public URL from Supabase storage 'media' bucket
  const { data } = supabase.storage.from('media').getPublicUrl(pathOrUrl);
  return data.publicUrl;
};

export default async function ArticlePreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <div className="p-8 text-center text-red-600">Supabase is not configured.</div>;
  }

  const { data: claimsResult } = await supabase.auth.getClaims();
  const isEditor = hasEditorRole(claimsResult ?? null);
  let articleQuery = supabase
    .from('articles')
    .select('*')
    .eq('id', id);

  if (!isEditor) {
    articleQuery = articleQuery.eq('status', 'published');
  }

  const { data: article, error } = await articleQuery.single();

  if (error || !article) {
    notFound();
  }

  const imageUrl = getPublicMediaUrl(supabase, article.image_url);
  const videoUrl = getPublicMediaUrl(supabase, article.video_url);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {article.status === 'published' && <ArticleViewTracker articleId={article.id} />}
        
        {/* Editorial Notice Banner */}
        <div className="bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 p-4 rounded-xl flex justify-between items-center text-amber-900 dark:text-amber-200 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>PREVIEW MODE — Status: <strong className="uppercase">{article.status?.replace('_', ' ') || 'DRAFT'}</strong></span>
          </div>
          <Link 
            href="/admin" 
            className="bg-amber-200 dark:bg-amber-800 px-3 py-1.5 rounded hover:bg-amber-300 transition"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
              {article.category || 'General'}
            </span>
            <span className="text-xs text-gray-400">
              {article.published_at || article.created_at
                ? new Date(article.published_at || article.created_at).toLocaleDateString()
                : 'Date unavailable'}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {article.title}
          </h1>

          {/* Image from media bucket */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden my-4 max-h-[450px] bg-gray-100 dark:bg-zinc-800">
              <Image
                src={imageUrl}
                alt={article.title}
                width={1200}
                height={800}
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Video from media bucket */}
          {videoUrl && (
            <div className="rounded-xl overflow-hidden my-4 bg-black p-2">
              <video src={videoUrl} controls className="w-full rounded-lg max-h-[400px]" />
            </div>
          )}

          <div className="pt-4">
            <ArticlePaywall content={article.content} title={article.title} />
          </div>
        </div>

        <ArticleComments articleId={article.id} />
      </div>
    </div>
  );
}