import { strings } from '@amigo/shared/strings';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Button, Card, ErrorBox, Field, H2, P, Screen } from '@/components/ui';
import { continueWithGoogle, GoogleAuthError } from '@/lib/google';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [busy, setBusy] = useState<'google' | 'signIn' | 'signUp' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const done = () => router.replace((next ?? '/') as Href);

  const google = async () => {
    setBusy('google');
    setError(null);
    try {
      if ((await continueWithGoogle()) === 'ok') done();
    } catch (e) {
      setError(
        e instanceof GoogleAuthError && e.code === 'identity_already_exists'
          ? strings.login.googleAlreadyUsed
          : strings.login.googleFailed,
      );
    } finally {
      setBusy(null);
    }
  };

  // Solo en desarrollo, mientras no exista el cliente OAuth de Google (docs/DECISIONS.md, I29)
  const devAuth = async (mode: 'signIn' | 'signUp') => {
    setBusy(mode);
    setError(null);
    setNotice(null);
    const credentials = { email: email.trim(), password };
    const result =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setBusy(null);
    if (result.error) {
      setError(result.error.message);
    } else if (mode === 'signUp' && !result.data.session) {
      setNotice(strings.login.checkEmail);
    } else {
      done();
    }
  };

  return (
    <Screen>
      <P>{strings.login.explain}</P>
      <ErrorBox message={error} />
      <Button title={strings.login.google} onPress={google} loading={busy === 'google'} />

      {__DEV__ ? (
        <Card>
          <H2>{strings.login.devTitle}</H2>
          {notice ? <P muted>{notice}</P> : null}
          <Field
            label={strings.login.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field label={strings.login.password} value={password} onChangeText={setPassword} secureTextEntry />
          <Button title={strings.login.signIn} onPress={() => devAuth('signIn')} loading={busy === 'signIn'} />
          <Button
            title={strings.login.signUp}
            variant="secondary"
            onPress={() => devAuth('signUp')}
            loading={busy === 'signUp'}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
