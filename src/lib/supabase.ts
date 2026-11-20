import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** true cuando las variables de entorno de Supabase están definidas. */
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('SU-PROYECTO') && !anonKey.includes('su-anon-key'),
);

/** Cliente Supabase (null si no hay configuración). Nunca usar la service_role key en el frontend. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('SUPABASE_NO_CONFIGURADO');
  return supabase;
}

/** URL base para enlaces públicos de seguimiento. */
export function publicSiteUrl(): string {
  const env = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  return (env && env.length > 0 ? env : `${window.location.origin}${import.meta.env.BASE_URL}`).replace(/\/$/, '');
}
