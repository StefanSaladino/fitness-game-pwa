import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveTopSetAppOrigin } from './appOrigin';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
}

export function getAppUrl(): string {
  return resolveTopSetAppOrigin({
    browserOrigin: typeof window !== 'undefined' ? window.location.origin : null,
    configuredOrigin: import.meta.env.VITE_APP_URL,
    isDev: import.meta.env.DEV,
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  // Validate the browser origin before the production backend is ever contacted.
  // Development builds may use localhost; production builds may not.
  getAppUrl();

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured. Copy .env.example to .env.local.');
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
