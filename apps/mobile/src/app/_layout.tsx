import { strings } from '@amigo/shared/strings';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/components/ui';
import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: strings.appName }} />
        <Stack.Screen name="login" options={{ title: strings.login.title }} />
        <Stack.Screen name="r/[token]" options={{ title: strings.appName }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="groups/new" options={{ title: strings.newGroup.title }} />
        <Stack.Screen name="groups/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="groups/[id]/manage" options={{ title: strings.manage.title }} />
        <Stack.Screen name="settings" options={{ title: strings.settings.title }} />
      </Stack>
    </AuthProvider>
  );
}
