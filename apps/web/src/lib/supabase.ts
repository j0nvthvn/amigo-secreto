import { createSupabaseClient } from '@amigo/shared/supabase';
import { env } from './env';

export const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' },
});

/** Sesión actual, o una anónima nueva (participantes sin cuenta). */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
