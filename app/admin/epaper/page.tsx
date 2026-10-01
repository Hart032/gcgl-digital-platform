import { redirect } from 'next/navigation';
import EpaperAdminClient from './EpaperAdminClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasAdminRole } from '@/lib/supabase';

export default async function EpaperAdminPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <main className="p-8 text-center text-red-700">Supabase is not configured.</main>;
  }

  const { data, error } = await supabase.auth.getClaims();
  if (error || !hasAdminRole(data?.claims ?? null)) {
    redirect('/dashboard?access=admin-required');
  }

  return <EpaperAdminClient />;
}