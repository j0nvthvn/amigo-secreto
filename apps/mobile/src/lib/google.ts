import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export class GoogleAuthError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/**
 * Login con Google en el navegador. Con sesión anónima vincula Google a esa misma cuenta
 * (linkIdentity) para no perder los grupos (R32); sin sesión, inicia sesión (signInWithOAuth).
 */
export async function continueWithGoogle(): Promise<'ok' | 'cancelled'> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data: current } = await supabase.auth.getSession();
  const options = { redirectTo, skipBrowserRedirect: true };
  const started = current.session?.user.is_anonymous
    ? await supabase.auth.linkIdentity({ provider: 'google', options })
    : await supabase.auth.signInWithOAuth({ provider: 'google', options });
  if (started.error) throw started.error;

  const result = await WebBrowser.openAuthSessionAsync(started.data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  url.searchParams.forEach((value, key) => params.set(key, value));
  const errorCode = params.get('error_code') ?? params.get('error');
  if (errorCode) throw new GoogleAuthError(errorCode);

  const code = params.get('code');
  if (!code) throw new GoogleAuthError('missing_code');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return 'ok';
}
