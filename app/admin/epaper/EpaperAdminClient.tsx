'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type IssueStatus = 'draft' | 'published';

type EpaperIssue = {
  id: string;
  title: string;
  issue_date: string;
  edition: string;
  cover_image_url: string | null;
  pdf_storage_path: string;
  status: IssueStatus;
  created_at: string;
};

const MAX_PDF_SIZE = 100 * 1024 * 1024;
const inputClassName = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-950';

export default function EpaperAdminClient() {
  const [issues, setIssues] = useState<EpaperIssue[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isSaving, setIsSaving] = useState(false);
  const [busyIssueId, setBusyIssueId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [edition, setEdition] = useState('Ghana');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let isActive = true;
    void client
      .from('epaper_issues')
      .select('id, title, issue_date, edition, cover_image_url, pdf_storage_path, status, created_at')
      .order('issue_date', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) setMessage({ text: 'Could not load E-Paper issues. Apply the E-Paper migration, then retry.', error: true });
        else setIssues((data as EpaperIssue[]) ?? []);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleCreateIssue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;
    if (!client) {
      setMessage({ text: 'Supabase is not configured.', error: true });
      return;
    }
    if (!pdfFile || (pdfFile.type !== 'application/pdf' && !pdfFile.name.toLowerCase().endsWith('.pdf'))) {
      setMessage({ text: 'Choose a PDF file to upload.', error: true });
      return;
    }
    if (pdfFile.size > MAX_PDF_SIZE) {
      setMessage({ text: 'PDFs must be 100 MB or smaller.', error: true });
      return;
    }

    setIsSaving(true);
    setMessage({ text: 'Uploading secure PDF...', error: false });
    const issueId = crypto.randomUUID();
    const objectPath = `issues/${issueId}/${crypto.randomUUID()}.pdf`;

    try {
      const { error: uploadError } = await client.storage
        .from('epaper')
        .upload(objectPath, pdfFile, { contentType: 'application/pdf', cacheControl: '300', upsert: false });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await client
        .from('epaper_issues')
        .insert({
          id: issueId,
          title: title.trim(),
          edition: edition.trim(),
          issue_date: issueDate,
          cover_image_url: coverImageUrl.trim() || null,
          pdf_storage_path: objectPath,
          status: publishNow ? 'published' : 'draft',
          published_at: publishNow ? new Date().toISOString() : null,
        })
        .select('id, title, issue_date, edition, cover_image_url, pdf_storage_path, status, created_at')
        .single();

      if (insertError) {
        await client.storage.from('epaper').remove([objectPath]);
        throw insertError;
      }

      setIssues((current) => [data as EpaperIssue, ...current].sort((a, b) => b.issue_date.localeCompare(a.issue_date)));
      setTitle('');
      setEdition('Ghana');
      setIssueDate(new Date().toISOString().slice(0, 10));
      setCoverImageUrl('');
      setPdfFile(null);
      setPublishNow(true);
      const fileInput = document.getElementById('epaper-pdf') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      setMessage({ text: 'E-Paper issue uploaded successfully.', error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Unable to upload this issue.', error: true });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleIssueStatus = async (issue: EpaperIssue) => {
    const client = supabase;
    if (!client) return;
    setBusyIssueId(issue.id);
    const nextStatus: IssueStatus = issue.status === 'published' ? 'draft' : 'published';
    const { data, error } = await client
      .from('epaper_issues')
      .update({ status: nextStatus, published_at: nextStatus === 'published' ? new Date().toISOString() : null })
      .eq('id', issue.id)
      .select('id, title, issue_date, edition, cover_image_url, pdf_storage_path, status, created_at')
      .single();

    setBusyIssueId(null);
    if (error) {
      setMessage({ text: 'Unable to update this issue. Check your admin role and try again.', error: true });
      return;
    }
    setIssues((current) => current.map((item) => item.id === issue.id ? data as EpaperIssue : item));
    setMessage({ text: `Issue ${nextStatus === 'published' ? 'published' : 'moved to drafts'}.`, error: false });
  };

  const deleteIssue = async (issue: EpaperIssue) => {
    const client = supabase;
    if (!client || !window.confirm(`Delete “${issue.title}”? This removes its PDF from the private archive.`)) return;

    setBusyIssueId(issue.id);
    const { error: rowError } = await client.from('epaper_issues').delete().eq('id', issue.id);
    if (rowError) {
      setBusyIssueId(null);
      setMessage({ text: 'Unable to delete this issue.', error: true });
      return;
    }

    setIssues((current) => current.filter((item) => item.id !== issue.id));
    const { error: fileError } = await client.storage.from('epaper').remove([issue.pdf_storage_path]);
    setBusyIssueId(null);
    setMessage(fileError
      ? { text: 'Issue removed. Its private PDF needs storage cleanup by an administrator.', error: true }
      : { text: 'Issue and PDF deleted.', error: false });
  };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-7 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-300 pb-5 dark:border-zinc-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700 dark:text-red-400">GCGL administration</p>
            <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">E-Paper issues</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Upload and publish subscriber editions.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/epaper" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900">View archive</Link>
            <Link href="/admin" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900">Admin home</Link>
          </div>
        </header>

        {message && (
          <div role={message.error ? 'alert' : 'status'} className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${message.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>
            {message.text}
            <button type="button" aria-label="Dismiss notification" onClick={() => setMessage(null)} className="font-bold opacity-70 hover:opacity-100">×</button>
          </div>
        )}

        <section className="grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={handleCreateIssue} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700 dark:text-red-400">New edition</p>
              <h2 className="mt-1 text-xl font-bold">Upload a PDF</h2>
            </div>

            <label className="block text-sm font-semibold">
              Issue title
              <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The Daily Graphic" className={inputClassName} />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Edition
                <input required maxLength={80} value={edition} onChange={(event) => setEdition(event.target.value)} className={inputClassName} />
              </label>
              <label className="block text-sm font-semibold">
                Issue date
                <input required type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className={inputClassName} />
              </label>
            </div>

            <label className="block text-sm font-semibold">
              Cover image URL <span className="font-normal text-gray-500">(optional)</span>
              <input type="url" maxLength={2048} value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="https://..." className={inputClassName} />
            </label>

            <label className="block text-sm font-semibold">
              PDF file
              <input id="epaper-pdf" required type="file" accept="application/pdf,.pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-lg border border-gray-300 bg-white text-sm file:mr-4 file:border-0 file:bg-gray-100 file:px-4 file:py-3 file:text-sm file:font-semibold dark:border-zinc-700 dark:bg-zinc-950 dark:file:bg-zinc-800" />
              <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-zinc-400">PDF only, up to 100 MB. Files are stored privately.</span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-zinc-800">
              <input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} className="mt-0.5 accent-red-700" />
              <span><span className="block font-semibold">Publish after upload</span><span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-zinc-400">Subscribers can open it as soon as it is published.</span></span>
            </label>

            <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60">
              {isSaving && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {isSaving ? 'Uploading issue...' : publishNow ? 'Upload and publish' : 'Upload as draft'}
            </button>
          </form>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700 dark:text-red-400">Issue archive</p>
                <h2 className="mt-1 text-xl font-bold">Manage editions</h2>
              </div>
              <span className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-semibold dark:bg-zinc-800">{issues.length} total</span>
            </div>

            {isLoading ? (
              <div className="space-y-3" aria-busy="true"><div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-zinc-800" /><div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-zinc-800" /></div>
            ) : issues.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500 dark:text-zinc-400">No editions yet. Upload the first issue to start the archive.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                {issues.map((issue) => (
                  <li key={issue.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-red-950">
                        {issue.cover_image_url ? <Image src={issue.cover_image_url} alt="" fill unoptimized sizes="48px" className="object-cover" /> : <span className="grid h-full place-items-center px-1 text-center text-[8px] font-bold text-white">{issue.edition}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{issue.title}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{issue.edition} · {new Date(`${issue.issue_date}T00:00:00`).toLocaleDateString()}</p>
                        <span className={`mt-1 inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase ${issue.status === 'published' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200'}`}>{issue.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Link href={`/epaper/${issue.id}`} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Preview</Link>
                      <button type="button" disabled={busyIssueId === issue.id} onClick={() => void toggleIssueStatus(issue)} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800">{issue.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                      <button type="button" disabled={busyIssueId === issue.id} onClick={() => void deleteIssue(issue)} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}