'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface AdminSidebarProps {
  role: 'editor' | 'superadmin';
}

type NavigationItem = {
  label: string;
  href: string;
  superadminOnly?: boolean;
  external?: boolean;
};

export default function AdminSidebar({ role }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isSuperadmin = role === 'superadmin';

  const items: NavigationItem[] = [
    { label: 'Overview', href: '#overview' },
    { label: 'Article editor', href: '#article-editor' },
    { label: 'Articles & drafts', href: '#article-directory' },
    { label: 'Brand performance', href: '#brand-performance' },
    { label: 'Ad campaigns', href: '#brand-ads', superadminOnly: true },
    { label: 'GCGL TV', href: '/tv', external: true },
    { label: 'E-Paper issues', href: '/admin/epaper', superadminOnly: true, external: true },
    { label: 'Membership tiers', href: '#membership-tiers', superadminOnly: true },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'Tab') {
        const dialog = document.getElementById('admin-navigation-dialog');
        const focusable = dialog?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open admin navigation"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="admin-navigation-dialog"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <span className="h-0.5 w-5 bg-current" />
        <span className="h-0.5 w-5 bg-current" />
        <span className="h-0.5 w-5 bg-current" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={close}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[1px]"
          />
          <aside
            id="admin-navigation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-navigation-title"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-gray-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700 dark:text-red-400">GCGL Admin</p>
                <h2 id="admin-navigation-title" className="mt-1 text-lg font-bold">Navigation</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  Signed in as {isSuperadmin ? 'Superadmin' : 'Editor'}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close admin navigation"
                className="grid h-9 w-9 place-items-center rounded-md border border-gray-300 text-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                ×
              </button>
            </div>
            <nav aria-label="Admin sections" className="flex-1 space-y-1 overflow-y-auto p-3">
              {items.filter((item) => !item.superadminOnly || isSuperadmin).map((item) => (
                item.external ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-zinc-200 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  >
                    {item.label}<span aria-hidden="true" className="float-right">↗</span>
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-zinc-200 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  >
                    {item.label}
                  </a>
                )
              ))}
            </nav>
            <p className="border-t border-gray-200 p-4 text-xs text-gray-500 dark:border-zinc-800 dark:text-zinc-400">
              Role access is enforced by server authorization and Supabase RLS.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
