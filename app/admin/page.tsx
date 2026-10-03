'use client';

import React, { startTransition, useCallback, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { hasEditorRole, hasSuperadminRole, isSupabaseConfigured } from '@/lib/supabase';
import Link from 'next/link';
import AdminSidebar from '@/app/components/AdminSidebar';
import BrandPerformanceDashboard from '@/app/components/BrandPerformanceDashboard';
import BrandAdsManager from '@/app/components/BrandAdsManager';
import MembershipTierManager from '@/app/components/MembershipTierManager';

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  video_provider: string | null;
  post_type: 'article' | 'video';
  published_at: string;
  status: 'draft' | 'published';
}

const DEFAULT_CATEGORIES = [
  'National Development',
  'Business',
  'Politics',
  'Sports',
  'World',
  'GCGL TV / Video',
];

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminAccess, setAdminAccess] = useState<'checking' | 'signed-out' | 'superadmin' | 'editor' | 'denied' | 'unconfigured'>(
    isSupabaseConfigured ? 'checking' : 'unconfigured'
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [category, setCategory] = useState('National Development');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  
  // Editor view mode: 'write' or 'preview'
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
  
  // URL states
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [postType, setPostType] = useState<'article' | 'video'>('article');
  const [videoProvider, setVideoProvider] = useState<'file' | 'youtube' | 'vimeo' | 'other'>('file');

  // File upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchingArticles, setFetchingArticles] = useState(Boolean(supabase));
  const [uploadProgress, setUploadProgress] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchArticles = useCallback(async (): Promise<Article[] | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error.message);
      return null;
    }

    return data || [];
  }, []);

  // Restore auth state before loading private editorial data.
  useEffect(() => {
    if (!supabase) return;

    let isActive = true;
    const setAccessFromUser = (user: { app_metadata?: Record<string, unknown> } | null) => {
      if (!isActive) return;
      setAdminAccess(!user ? 'signed-out' : hasSuperadminRole(user) ? 'superadmin' : hasEditorRole(user) ? 'editor' : 'denied');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessFromUser(session?.user ?? null);
    });

    void supabase.auth.getUser()
      .then(({ data, error }) => {
        if (error) {
          if (error.message !== 'Auth session missing!') {
            console.error('Error checking editor session:', error.message);
          }
          setAccessFromUser(null);
          return;
        }
        setAccessFromUser(data.user);
      })
      .catch((error: unknown) => {
        if (error && typeof error === 'object' && 'message' in error && error.message !== 'Auth session missing!') {
          console.error('Error checking editor session:', error.message);
        }
        setAccessFromUser(null);
      });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (adminAccess !== 'superadmin' && adminAccess !== 'editor') return;

    let isActive = true;
    void fetchArticles()
      .then((data) => {
        if (!isActive) return;
        if (data) setArticles(data);
        setFetchingArticles(false);
      })
      .catch((error: unknown) => {
        console.error('Error fetching articles:', error);
        if (isActive) setFetchingArticles(false);
      });

    const savedCategories = localStorage.getItem('gcgl_admin_categories');
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((item) => typeof item === 'string')) {
          startTransition(() => setCategories(parsed));
        }
      } catch (e) {
        console.error('Error loading custom categories', e);
      }
    }

    return () => {
      isActive = false;
    };
  }, [adminAccess, fetchArticles]);

  const refreshArticles = async () => {
    setFetchingArticles(true);
    try {
      const data = await fetchArticles();
      if (data) setArticles(data);
    } catch (error: unknown) {
      console.error('Error fetching articles:', error);
    } finally {
      setFetchingArticles(false);
    }
  };

  // Helper function to upload files to Supabase Storage
  const uploadFileToSupabase = async (file: File, folder: string): Promise<string | null> => {
    if (!supabase) {
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media') // Ensure you have a public storage bucket named 'media' in Supabase
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL of the uploaded asset
      const { data } = supabase.storage.from('media').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: unknown) {
      console.error('Storage upload error:', err instanceof Error ? err.message : err);
      return null;
    }
  };

  // Rich Text Formatting Helper
  const insertFormatting = (syntaxStart: string, syntaxEnd: string = '', defaultText: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;
    
    const replacement = `${syntaxStart}${selectedText}${syntaxEnd}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    
    setContent(newContent);

    // Reset cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntaxStart.length, start + syntaxStart.length + selectedText.length);
    }, 0);
  };

  // Simple Markdown Parser for Preview Layout
  const renderMarkdownPreview = (text: string) => {
    if (!text) return <p className="text-gray-400 italic">Nothing to preview yet...</p>;

    return text.split('\n').map((line, idx) => {
      let formatted = line;
      // Bold
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold font-serif mt-3 mb-1 text-red-600">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="ml-5 list-disc" dangerouslySetInnerHTML={{ __html: formatted.replace('- ', '') }} />;
      }
      if (/^\d+\.\s/.test(line)) {
        return <li key={idx} className="ml-5 list-decimal" dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s/, '') }} />;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={idx} className="border-l-4 border-red-600 pl-4 italic my-2 text-gray-600 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: formatted.replace('> ', '') }} />;
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2"></div>;
      }
      return <p key={idx} className="my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  // Category Manager Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      setMessage('Category already exists!');
      return;
    }

    const updated = [...categories, trimmed];
    setCategories(updated);
    localStorage.setItem('gcgl_admin_categories', JSON.stringify(updated));
    setNewCategoryName('');
    setMessage(`Category "${trimmed}" added successfully!`);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) {
      alert('You must have at least one category.');
      return;
    }
    if (!confirm(`Are you sure you want to remove category "${catToDelete}"?`)) return;

    const updated = categories.filter((c) => c !== catToDelete);
    setCategories(updated);
    localStorage.setItem('gcgl_admin_categories', JSON.stringify(updated));

    if (category === catToDelete) {
      setCategory(updated[0]);
    }
    setMessage(`Category "${catToDelete}" removed.`);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!supabase) {
      setMessage('Supabase is not configured. Check the public Supabase environment variables.');
      return;
    }

    if (postType === 'video' && !videoUrl.trim() && !videoFile) {
      setMessage('Add a video URL or choose a video file before publishing a video post.');
      return;
    }

    setLoading(true);

    let finalImageUrl = imageUrl;
    let finalVideoUrl = postType === 'video' ? videoUrl : '';
    let finalVideoProvider: 'file' | 'youtube' | 'vimeo' | 'other' | null = postType === 'video' ? videoProvider : null;

    // 1. Handle Image Upload if a file was selected
    if (imageFile) {
      setUploadProgress('Uploading cover image...');
      const uploadedUrl = await uploadFileToSupabase(imageFile, 'images');
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        setMessage('Failed to upload image file.');
        setLoading(false);
        return;
      }
    }

    // 2. Handle Video Upload if a file was selected
    if (postType === 'video' && videoFile) {
      if (videoFile.size > 50 * 1024 * 1024) {
        setMessage('Video files must be 50 MB or smaller.');
        setLoading(false);
        return;
      }
      if (!['video/mp4', 'video/webm'].includes(videoFile.type)) {
        setMessage('Choose an MP4 or WebM video file.');
        setLoading(false);
        return;
      }
      setUploadProgress('Uploading video file (this may take a moment)...');
      const uploadedUrl = await uploadFileToSupabase(videoFile, 'videos');
      if (uploadedUrl) {
        finalVideoUrl = uploadedUrl;
        finalVideoProvider = 'file';
      } else {
        setMessage('Failed to upload video file.');
        setLoading(false);
        return;
      }
    }

    setUploadProgress(editingId ? 'Updating article...' : 'Saving article to database...');

    if (editingId) {
      // 3a. Update existing record
      const { error } = await supabase
        .from('articles')
        .update({
          title,
          category,
          content,
          image_url: finalImageUrl || null,
          video_url: finalVideoUrl || null,
          video_provider: finalVideoUrl ? finalVideoProvider : null,
          post_type: postType,
          status,
        })
        .eq('id', editingId);

      setLoading(false);
      setUploadProgress('');

      if (error) {
        console.error('Error updating article:', error.message);
        setMessage(`Failed to update: ${error.message}`);
      } else {
        setMessage(`Article updated and saved as ${status} successfully!`);
        resetForm();
        refreshArticles();
      }
    } else {
      // 3b. Insert new record into Supabase articles table
      const { error } = await supabase.from('articles').insert([
        {
          title,
          category,
          content,
          image_url: finalImageUrl || null,
          video_url: finalVideoUrl || null,
          video_provider: finalVideoUrl ? finalVideoProvider : null,
          post_type: postType,
          published_at: new Date().toISOString(),
          status,
        },
      ]);

      setLoading(false);
      setUploadProgress('');

      if (error) {
        console.error('Error publishing article:', error.message);
        setMessage(`Failed to publish: ${error.message}`);
      } else {
        setMessage(`Article successfully saved as ${status}!`);
        resetForm();
        refreshArticles();
      }
    }
  };

  const handleToggleStatus = async (article: Article) => {
    if (!supabase) return;
    const newStatus = article.status === 'published' ? 'draft' : 'published';

    const { error } = await supabase
      .from('articles')
      .update({ status: newStatus })
      .eq('id', article.id);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      setArticles(
        articles.map((art) => (art.id === article.id ? { ...art, status: newStatus } : art))
      );
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageUrl('');
    setVideoUrl('');
    setPostType('article');
    setVideoProvider('file');
    setImageFile(null);
    setVideoFile(null);
    setStatus('published');
    setEditingId(null);
  };

  const handleEdit = (article: Article) => {
    setEditingId(article.id);
    setTitle(article.title);
    setCategory(article.category);
    setContent(article.content);
    setImageUrl(article.image_url || '');
    setVideoUrl(article.video_url || '');
    setPostType(article.post_type || (article.video_url ? 'video' : 'article'));
    setVideoProvider((article.video_provider as 'file' | 'youtube' | 'vimeo' | 'other' | null) || 'file');
    setStatus(article.status || 'published');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this article?')) return;

    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) {
      alert('Error deleting article: ' + error.message);
    } else {
      setArticles(articles.filter((art) => art.id !== id));
      if (editingId === id) resetForm();
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setAdminAccess('unconfigured');
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setAuthMessage(error.message);
      setAdminAccess('signed-out');
    } else if (!hasEditorRole(data.user)) {
      await supabase.auth.signOut();
      setAuthMessage('This account does not have administrative access.');
      setAdminAccess('signed-out');
    } else {
      setLoginPassword('');
      setAdminAccess(hasSuperadminRole(data.user) ? 'superadmin' : 'editor');
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthMessage('Unable to sign out. Please try again.');
    setAdminAccess('signed-out');
  };

  if (adminAccess !== 'superadmin' && adminAccess !== 'editor') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100">
        <section className="w-full max-w-md space-y-5 rounded-lg border border-gray-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-xs font-semibold uppercase text-red-600">GCGL Editorial</p>
            <h1 className="mt-1 text-2xl font-bold">Administrator sign in</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Sign in with an account assigned the superadmin or editor role.
            </p>
          </div>

          {adminAccess === 'checking' ? (
            <p className="text-sm text-gray-500">Checking your session...</p>
          ) : adminAccess === 'unconfigured' ? (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the app.
            </p>
          ) : adminAccess === 'denied' ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">This account is not authorized to manage articles.</p>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <label className="block text-sm font-medium">
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </label>
              {authMessage && <p role="alert" className="text-sm text-red-600">{authMessage}</p>}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {authLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}
        </section>
      </main>
    );
  }

  const filteredArticles = articles.filter(
    (art) =>
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute Analytics Data
  const totalPublished = articles.filter((a) => a.status === 'published').length;
  const totalDrafts = articles.filter((a) => a.status === 'draft').length;
  
  // Most Active Category calculation
  const categoryCounts: { [key: string]: number } = {};
  articles.forEach((a) => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });
  const mostActiveCategory = Object.keys(categoryCounts).reduce((a, b) => 
    categoryCounts[a] > categoryCounts[b] ? a : b, 'None'
  );

  // Recent Media Uploads Count
  const recentMediaUploads = articles.filter((a) => a.image_url || a.video_url).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 p-6 md:p-12">
      <div id="overview" className="mx-auto max-w-4xl space-y-10">
        
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-4 sm:p-8 border border-gray-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <AdminSidebar role={adminAccess} />
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${adminAccess === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'}`}>
                {adminAccess === 'superadmin' ? 'Superadmin' : 'Editor'}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-serif text-red-600">GCGL Admin Portal</h1>
            <p className="text-xs text-gray-500">Publish news, images, and video reports with storage uploads</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {adminAccess === 'superadmin' && (
              <Link href="/admin/epaper" className="text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 px-3 py-1.5 rounded hover:bg-red-200 dark:hover:bg-red-900 transition">
                E-Paper Issues
              </Link>
            )}
            <Link href="/tv" className="text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition">
              GCGL TV
            </Link>
            <Link href="/" className="text-xs font-semibold bg-gray-200 dark:bg-zinc-800 px-3 py-1.5 rounded hover:bg-gray-300 transition">
              View Live Site →
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-semibold border border-gray-300 dark:border-zinc-700 px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            >
              Sign out
            </button>
          </div>
        </div>

        <div id="brand-performance"><BrandPerformanceDashboard /></div>
        {adminAccess === 'superadmin' && <div id="brand-ads"><BrandAdsManager /></div>}
        {adminAccess === 'superadmin' && <div id="membership-tiers"><MembershipTierManager /></div>}

        {/* Analytics Counter Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-zinc-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-gray-400">Published Articles</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPublished}</span>
              <span className="text-[11px] text-gray-400">{totalDrafts} Drafts</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-zinc-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-gray-400">Most Active Category</span>
            <div className="mt-2">
              <span className="text-sm font-bold truncate block text-red-600" title={mostActiveCategory}>
                {mostActiveCategory !== 'None' ? mostActiveCategory : 'No Articles'}
              </span>
              <span className="text-[11px] text-gray-400">{categoryCounts[mostActiveCategory] || 0} stories</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-zinc-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-gray-400">Media Attachments</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{recentMediaUploads}</span>
              <span className="text-[11px] text-gray-400">Images / Videos</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-zinc-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-gray-400">Categories Total</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{categories.length}</span>
              <span className="text-[11px] text-gray-400">Active groups</span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium ${message.includes('successfully') || message.includes('added') ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
            {message}
          </div>
        )}

        {/* Category Manager Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6 border border-gray-200 dark:border-zinc-800 space-y-4">
          <div className="border-b pb-3 dark:border-zinc-800">
            <h2 className="text-md font-bold">Category Manager</h2>
            <p className="text-xs text-gray-500">Add or remove article classification tags</p>
          </div>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input 
              type="text"
              placeholder="New category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 rounded-lg border p-2.5 text-xs dark:bg-zinc-800 dark:border-zinc-700"
            />
            <button 
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition"
            >
              Add Category
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 text-xs px-3 py-1.5 rounded-full font-medium">
                {cat}
                {categories.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="text-gray-400 hover:text-red-600 font-bold ml-1"
                    title="Remove category"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Publish / Edit Form */}
        <div id="article-editor" className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-8 border border-gray-200 dark:border-zinc-800">
          <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-zinc-800">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Article' : 'Create New Article'}</h2>
            {editingId && (
              <button 
                type="button" 
                onClick={resetForm} 
                className="text-xs bg-gray-300 dark:bg-zinc-800 px-2.5 py-1 rounded hover:opacity-80"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handlePublish} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Article Title</label>
              <input 
                type="text" 
                required 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Graphic News Live Briefing on National Economy"
                className="w-full rounded-lg border p-3 text-sm dark:bg-zinc-800 dark:border-zinc-700" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full rounded-lg border p-3 text-sm dark:bg-zinc-800 dark:border-zinc-700"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="post-type" className="block text-xs font-semibold uppercase mb-1">Post type</label>
                <select
                  id="post-type"
                  value={postType}
                  onChange={(event) => setPostType(event.target.value as 'article' | 'video')}
                  className="w-full rounded-lg border p-3 text-sm dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                </select>
              </div>

              {/* Status Toggle Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Publication Status</label>
                <div className="flex rounded-lg border border-gray-300 dark:border-zinc-700 overflow-hidden bg-gray-50 dark:bg-zinc-800 p-1">
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                      status === 'draft'
                        ? 'bg-amber-500 text-white shadow'
                        : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    📝 Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                      status === 'published'
                        ? 'bg-green-600 text-white shadow'
                        : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    🚀 Published
                  </button>
                </div>
              </div>
            </div>

            {/* COVER IMAGE SECTION */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800 space-y-3 bg-gray-50 dark:bg-zinc-900/50">
              <label className="block text-xs font-semibold uppercase text-red-600">Cover Image Options</label>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Option A: Upload Image File</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Option B: Or paste Image URL</label>
                <input 
                  type="url" 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)} 
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700" 
                />
              </div>
            </div>

            {/* VIDEO UPLOAD SECTION */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800 space-y-3 bg-gray-50 dark:bg-zinc-900/50">
              <label className="block text-xs font-semibold uppercase text-red-600">Video Report Options</label>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Option A: Upload Video File (MP4, WebM)</label>
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Option B: Or paste YouTube / Direct Video Link</label>
                <input 
                  type="url" 
                  value={videoUrl} 
                  onChange={(e) => setVideoUrl(e.target.value)} 
                  placeholder="https://www.youtube.com/watch?v=xxxxxx"
                  className="w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700" 
                />
                <label className="mt-3 block text-xs font-medium text-gray-500">
                  Video provider
                  <select
                    value={videoProvider}
                    onChange={(event) => setVideoProvider(event.target.value as 'file' | 'youtube' | 'vimeo' | 'other')}
                    className="mt-1 w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    <option value="file">Direct video / uploaded file</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="other">Other direct video URL</option>
                  </select>
                </label>
              </div>
            </div>

            {/* ARTICLE CONTENT WITH FORMATTING TOOLBAR & LIVE PREVIEW TOGGLE */}
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold uppercase">Article Content / Video Description</label>
                
                {/* Write / Preview Mode Switcher */}
                <div className="flex bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorMode('write')}
                    className={`px-3 py-1 rounded-md transition ${editorMode === 'write' ? 'bg-white dark:bg-zinc-700 shadow-sm text-red-600' : 'text-gray-500'}`}
                  >
                    ✏️ Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`px-3 py-1 rounded-md transition ${editorMode === 'preview' ? 'bg-white dark:bg-zinc-700 shadow-sm text-red-600' : 'text-gray-500'}`}
                  >
                    👁️ Preview Layout
                  </button>
                </div>
              </div>

              {editorMode === 'write' ? (
                <>
                  {/* Formatting Toolbar */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-100 dark:bg-zinc-800/80 rounded-t-lg border border-b-0 border-gray-300 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => insertFormatting('**', '**', 'bold text')}
                      className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-zinc-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 transition"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*', 'italic text')}
                      className="px-2.5 py-1 text-xs italic bg-white dark:bg-zinc-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 transition"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('### ', '', 'Heading 3')}
                      className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-zinc-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 transition"
                      title="Heading"
                    >
                      H3
                    </button>
                    <span className="w-px bg-gray-300 dark:bg-zinc-600 my-1 mx-1"></span>
                    <button
                      type="button"
                      onClick={() => insertFormatting('- ', '', 'List item')}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 transition"
                      title="Bullet List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('1. ', '', 'Numbered item')}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 transition"
                      title="Numbered List"
                    >
                      1. List
                    </button>
                    <span className="w-px bg-gray-300 dark:bg-zinc-600 my-1 mx-1"></span>
                    <button
                      type="button"
                      onClick={() => insertFormatting('> ', '', 'Quote text')}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 transition"
                      title="Quote / Callout"
                    >
                      “ Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('[', '](https://example.com)', 'link text')}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 transition"
                      title="Insert Hyperlink"
                    >
                      🔗 Link
                    </button>
                  </div>

                  <textarea 
                    ref={textareaRef}
                    required 
                    rows={8}
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                    placeholder="Write or paste your report summary or video notes here..."
                    className="w-full rounded-b-lg rounded-t-none border border-t-0 p-3 text-sm dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-red-500" 
                  />
                </>
              ) : (
                /* WYSIWYG / Markdown Layout Preview Tab */
                <div className="w-full min-h-[220px] rounded-lg border border-gray-300 dark:border-zinc-700 p-4 text-sm bg-white dark:bg-zinc-900 overflow-y-auto space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-red-600 border-b pb-1 mb-2 dark:border-zinc-800">
                    Live Layout Preview Mode
                  </div>
                  {renderMarkdownPreview(content)}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition shadow-md flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>{uploadProgress || 'Saving...'}</span>
              ) : (
                <span>{editingId ? 'Update Article' : 'Save Article'}</span>
              )}
            </button>
          </form>
        </div>

        {/* Article Management Table */}
        <div id="article-directory" className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-8 border border-gray-200 dark:border-zinc-800 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-4 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-bold">Articles & Drafts Directory</h2>
              <p className="text-xs text-gray-500">Manage, toggle publication status, edit, or delete existing stories</p>
            </div>
            <input 
              type="text"
              placeholder="Search by title or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 rounded-lg border p-2 text-xs dark:bg-zinc-800 dark:border-zinc-700"
            />
          </div>

          {fetchingArticles ? (
            <p className="text-sm text-center py-6 text-gray-500">Loading articles...</p>
          ) : filteredArticles.length === 0 ? (
            <p className="text-sm text-center py-6 text-gray-500">No articles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b dark:border-zinc-800 text-xs text-gray-500 uppercase">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition">
                      <td className="py-3 px-4 font-medium max-w-xs truncate">{article.title}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2.5 py-1 rounded-full font-semibold">
                          {article.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(article)}
                          title="Click to toggle status"
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                            article.status === 'published'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 hover:bg-green-200'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {article.status === 'published' ? '🚀 Published' : '📝 Draft'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {new Date(article.published_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(article)}
                          className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 px-3 py-1 rounded font-semibold hover:bg-blue-100 transition"
                        >
                          Edit
                        </button>
                        {adminAccess === 'superadmin' && (
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="text-xs bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300 px-3 py-1 rounded font-semibold hover:bg-red-100 transition"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}