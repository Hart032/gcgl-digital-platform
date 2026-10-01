import { createClient } from '@supabase/supabase-js';

// Use placeholders during build-time static analysis if environment variables aren't injected yet
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ Supabase URL is missing. Using build-time fallback.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);