import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasValidSupabaseConfig =
  typeof supabaseUrl === 'string' && /^https?:\/\//.test(supabaseUrl) && typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0;

export const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;