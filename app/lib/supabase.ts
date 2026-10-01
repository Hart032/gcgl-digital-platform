const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfig =
  supabaseUrl && supabaseKey
    ? { url: supabaseUrl, key: supabaseKey }
    : null;

export const isSupabaseConfigured = supabaseConfig !== null;

function getAppRole(payload: unknown): string | undefined {
  const normalized = payload as
    | null
    | {
        app_metadata?: { role?: string } | null;
        claims?: { app_metadata?: { role?: string } | null } | null;
      };

  return normalized?.claims?.app_metadata?.role ?? normalized?.app_metadata?.role;
}

export function hasAdminRole(payload: unknown): boolean {
  return getAppRole(payload) === 'admin';
}

export function hasEditorRole(payload: unknown): boolean {
  const role = getAppRole(payload);
  return role === 'admin' || role === 'editor';
}