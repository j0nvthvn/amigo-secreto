import { strings } from '@amigo/shared/strings';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Button, Card, ErrorBox, H2, P, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { continueWithGoogle, GoogleAuthError } from '@/lib/google';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { session, isAnonymous } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveWithGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await continueWithGoogle();
    } catch (e) {
      setError(
        e instanceof GoogleAuthError && e.code === 'identity_already_exists'
          ? strings.login.googleAlreadyUsed
          : strings.login.googleFailed,
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <Screen>
      <Card>
        <H2>{strings.settings.account}</H2>
        <P muted>
          {session && !isAnonymous && session.user.email
            ? strings.settings.signedInAs(session.user.email)
            : strings.settings.anonymous}
        </P>
        {session && isAnonymous ? (
          <>
            <P muted>{strings.settings.saveWithGoogleHelp}</P>
            <ErrorBox message={error} />
            <Button title={strings.settings.saveWithGoogle} onPress={saveWithGoogle} loading={busy} />
          </>
        ) : null}
      </Card>

      <Button
        title={strings.settings.privacy}
        variant="secondary"
        onPress={() => WebBrowser.openBrowserAsync(`${env.webOrigin}/privacidad`)}
      />
      <Button
        title={strings.settings.deleteAccount}
        variant="secondary"
        onPress={() => WebBrowser.openBrowserAsync(`${env.webOrigin}/eliminar-cuenta`)}
      />
      {__DEV__ && session ? <Button title={strings.settings.signOut} variant="ghost" onPress={signOut} /> : null}
      <P muted>{strings.settings.version(Constants.expoConfig?.version ?? '')}</P>
    </Screen>
  );
}
