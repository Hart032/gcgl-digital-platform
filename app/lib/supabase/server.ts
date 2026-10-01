import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from '../supabase';

export async function createSupabaseServerClient() {
  if (!supabaseConfig) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          return;
        }
      },
    },
  });
}
