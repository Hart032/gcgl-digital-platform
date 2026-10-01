'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type CommentRow = {
  id: string;
  article_id: number;
  user_id: string;
  display_name: string;
  comment: string;
  created_at: string;
};

interface ArticleCommentsProps {
  articleId: number;
}

export default function ArticleComments({ articleId }: ArticleCommentsProps) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState('Reader');

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data: userData } = await client.auth.getUser();
      const activeUser = userData.user;

      if (isMounted) {
        setIsSignedIn(Boolean(activeUser));
        if (activeUser) {
          const metadata = activeUser.user_metadata ?? {};
          setDisplayName(
            String(metadata.full_name ?? metadata.name ?? activeUser.email?.split('@')[0] ?? 'Reader')
          );
        }
      }
    };

    const loadComments = async () => {
      const { data, error } = await client
        .from('article_comments')
        .select('id, article_id, user_id, display_name, comment, created_at')
        .eq('article_id', articleId)
        .order('created_at', { ascending: true });

      if (isMounted) {
        if (!error) {
          setComments((data as CommentRow[]) ?? []);
        }
        setLoading(false);
      }
    };

    void syncSession();
    void loadComments();

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      const loggedIn = Boolean(session?.user);
      setIsSignedIn(loggedIn);
      if (loggedIn && session?.user) {
        const metadata = session.user.user_metadata ?? {};
        setDisplayName(
          String(metadata.full_name ?? metadata.name ?? session.user.email?.split('@')[0] ?? 'Reader')
        );
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [articleId]);

  const commentsLabel = useMemo(() => {
    if (comments.length === 0) return 'No comments yet';
    if (comments.length === 1) return '1 comment';
    return `${comments.length} comments`;
  }, [comments.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) return;

    const trimmed = draft.trim();
    if (!trimmed) {
      setAuthMessage('Write a comment before posting.');
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setAuthMessage('Please sign in to share your thoughts.');
      return;
    }

    setSubmitting(true);
    setAuthMessage('');

    const { data, error } = await supabase
      .from('article_comments')
      .insert({
        article_id: articleId,
        user_id: userData.user.id,
        display_name: displayName,
        comment: trimmed,
      })
      .select('id, article_id, user_id, display_name, comment, created_at')
      .single();

    setSubmitting(false);

    if (error || !data) {
      setAuthMessage(error?.message ?? 'Unable to post your comment right now.');
      return;
    }

    setComments((current) => [...current, data as CommentRow]);
    setDraft('');
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Reader discussion</p>
          <h2 className="mt-1 text-2xl font-bold">{commentsLabel}</h2>
        </div>
      </div>

      {!isSignedIn ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
          Sign in to join the conversation as a verified reader.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3">
          <label className="block text-sm font-medium">
            Share your thoughts
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              placeholder={`Write something thoughtful as ${displayName}...`}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          {authMessage && <p className="text-sm text-red-600">{authMessage}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? 'Posting...' : 'Post comment'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500">Be the first to share a comment on this article.</p>
        ) : (
          comments.map((comment) => {
            const author = comment.display_name || 'Reader';
            const createdAt = new Date(comment.created_at).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <article key={comment.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-zinc-100">{author}</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">{createdAt}</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-zinc-300">{comment.comment}</p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
