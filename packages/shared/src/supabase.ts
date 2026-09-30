import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type AppSupabaseClient = SupabaseClient<Database>;

/** Crea el cliente de Supabase tipado. Cada app pasa su URL, su clave pública y su almacenamiento de sesión. */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>,
): AppSupabaseClient {
  return createClient<Database>(url, anonKey, options);
}
