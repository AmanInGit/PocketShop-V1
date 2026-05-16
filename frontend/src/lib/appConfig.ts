const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_SUPABASE_KEY = 'placeholder-key';

export function getSupabaseEnv() {
  return {
    url: (import.meta.env.VITE_SUPABASE_URL || '').trim(),
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return false;
  if (url === PLACEHOLDER_SUPABASE_URL || anonKey === PLACEHOLDER_SUPABASE_KEY) {
    return false;
  }
  return true;
}

export const missingSupabaseEnvMessage =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your host environment (Cloudflare Pages → Settings → Environment variables).';
