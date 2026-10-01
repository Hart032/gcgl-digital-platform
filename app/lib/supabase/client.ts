'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from '../supabase';

export const supabase = supabaseConfig
  ? createBrowserClient(supabaseConfig.url, supabaseConfig.key)
  : null;
