import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@amigo/shared/database.types';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

/** Conexión al Supabase local levantado con `supabase start`. */
interface LocalStatus {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
}

const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) as LocalStatus;

export type Client = SupabaseClient<Database>;

const options = { auth: { persistSession: false, autoRefreshToken: false } };

function client(key: string): Client {
  return createClient<Database>(status.API_URL, key, options);
}

export const admin = client(status.SERVICE_ROLE_KEY);

/** Usuario no anónimo, como quien entra con Google. */
export async function googleUser(): Promise<Client> {
  const email = `owner-${randomUUID()}@test.local`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const c = client(status.ANON_KEY);
  const signedIn = await c.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return c;
}

export async function anonymousUser(): Promise<Client> {
  const c = client(status.ANON_KEY);
  const { error } = await c.auth.signInAnonymously();
  if (error) throw error;
  return c;
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Crea un grupo con el dueño participando como "Dueño" y agrega a las personas indicadas. */
export async function createGroup(owner: Client, names: string[]): Promise<{ groupId: string; memberIds: Map<string, string> }> {
  const created = await owner.rpc('create_group', {
    p_name: `Grupo ${randomUUID().slice(0, 8)}`,
    p_event_date: inDays(30),
    p_owner_participates: true,
    p_owner_display_name: 'Dueño',
  });
  if (created.error) throw created.error;
  const groupId = created.data;

  const memberIds = new Map<string, string>();
  for (const name of names) {
    const added = await owner.rpc('add_member', { p_group_id: groupId, p_display_name: name });
    if (added.error) throw added.error;
    const { member_id } = added.data as { member_id: string };
    memberIds.set(name, member_id);
  }
  return { groupId, memberIds };
}
