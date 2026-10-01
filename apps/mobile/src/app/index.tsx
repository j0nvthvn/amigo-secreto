import { getMyGroups, type MyGroup } from '@amigo/shared/api';
import { formatEventDate } from '@amigo/shared/format';
import { parseInviteToken } from '@amigo/shared/links';
import { strings } from '@amigo/shared/strings';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorBox, Field, H2, Loading, P, Row, Screen, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useLoader } from '@/lib/use-loader';

function statusLabel(g: MyGroup): string {
  if (g.archived) return strings.status.archived;
  return strings.status[g.status];
}

export default function HomeScreen() {
  const { session, ready, isAnonymous } = useAuth();
  const groups = useLoader(async () => (session ? getMyGroups(supabase) : []));
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  if (!ready) return <Loading />;

  const openLink = () => {
    const token = parseInviteToken(link);
    if (!token) {
      setLinkError(strings.home.invalidLink);
      return;
    }
    setLink('');
    setLinkOpen(false);
    router.push(`/r/${token}`);
  };

  const createGroup = () => router.push(session && !isAnonymous ? '/groups/new' : '/login?next=/groups/new');

  return (
    <Screen refreshing={groups.refreshing} onRefresh={groups.reload}>
      <Stack.Screen
        options={{
          headerRight: () => <Button title={strings.home.settings} variant="ghost" small onPress={() => router.push('/settings')} />,
        }}
      />
      <ErrorBox message={groups.error} />

      {groups.data && groups.data.length > 0 ? (
        <View style={{ gap: 12 }}>
          <H2>{strings.home.title}</H2>
          {groups.data.map((g) => (
            <Pressable key={g.group_id} onPress={() => router.push(`/groups/${g.group_id}`)}>
              <Card>
                <Text style={styles.h2}>{g.name}</Text>
                <P muted>{formatEventDate(g.event_date)}</P>
                <Row>
                  <Badge label={statusLabel(g)} tone={g.status === 'drawn' && !g.archived ? 'success' : 'neutral'} />
                  {g.is_owner ? <Badge label={strings.home.owner} tone="primary" /> : null}
                  {g.unread > 0 ? <Badge label={strings.home.unread(g.unread)} tone="primary" /> : null}
                </Row>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : groups.data ? (
        <P muted>{strings.home.empty}</P>
      ) : null}

      <Button title={strings.home.createGroup} onPress={createGroup} />
      {linkOpen ? (
        <Card>
          <Field
            label={strings.home.haveLink}
            placeholder={strings.home.linkPlaceholder}
            value={link}
            onChangeText={(t) => {
              setLink(t);
              setLinkError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            error={linkError}
          />
          <Button title={strings.home.openLink} onPress={openLink} disabled={!link.trim()} />
        </Card>
      ) : (
        <Button title={strings.home.haveLink} variant="secondary" onPress={() => setLinkOpen(true)} />
      )}
    </Screen>
  );
}
