import type { SupabaseClient } from '@supabase/supabase-js';
import { hasAdminRole } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AuthorizationResult =
  | { ok: true; client: SupabaseClient; userId: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

export async function authorizeRequest(requiredRole: 'registered' | 'admin'): Promise<AuthorizationResult> {
  const client = await createSupabaseServerClient();
  if (!client) {
    return { ok: false, status: 503, message: 'Supabase is not configured.' };
  }

  const { data, error } = await client.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) {
    return { ok: false, status: 401, message: 'Authentication is required.' };
  }

  if (requiredRole === 'admin' && !hasAdminRole(data.claims)) {
    return { ok: false, status: 403, message: 'Administrative access is required.' };
  }

  return { ok: true, client, userId };
}