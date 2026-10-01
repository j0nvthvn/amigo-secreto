import {
  addWishlistItem,
  deleteWishlistItem,
  getActivity,
  getGroup,
  getWishlist,
  revealResult,
  type GroupDetail,
  type WishlistItem,
} from '@amigo/shared/api';
import { formatBudget, formatDateTime, formatEventDate } from '@amigo/shared/format';
import { wishlistItemSchema } from '@amigo/shared/schemas';
import { strings } from '@amigo/shared/strings';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorBox, Field, H1, H2, Loading, P, Row, Screen, styles } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { messageOf, useLoader } from '@/lib/use-loader';

async function loadGroup(groupId: string) {
  const detail = await getGroup(supabase, groupId);
  const me = detail.members.find((m) => m.id === detail.my_member_id);
  const [activity, myWishlist] = await Promise.all([
    getActivity(supabase, groupId),
    me ? getWishlist(supabase, me.id) : Promise.resolve([]),
  ]);
  // Si ya reveló, se muestra de nuevo (sin crear otro evento)
  const result = detail.group.status === 'drawn' && me?.result_viewed ? await revealResult(supabase, groupId) : null;
  const theirWishlist = result ? await getWishlist(supabase, result.receiver_member_id) : [];
  return { detail, activity, myWishlist, result, theirWishlist };
}

function WishlistView({ items, onDelete }: { items: WishlistItem[]; onDelete?: (id: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <View key={item.id} style={[styles.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}>
          <View style={styles.flex}>
            <P>• {item.text}</P>
            {item.url ? (
              <Text style={[styles.small, { color: '#1D4ED8' }]} onPress={() => Linking.openURL(item.url ?? '')}>
                {item.url}
              </Text>
            ) : null}
          </View>
          {onDelete ? <Button title={strings.common.delete} variant="ghost" small onPress={() => onDelete(item.id)} /> : null}
        </View>
      ))}
    </View>
  );
}

function ResultBlock({
  detail,
  result,
  theirWishlist,
  onReveal,
  revealing,
}: {
  detail: GroupDetail;
  result: Awaited<ReturnType<typeof loadGroup>>['result'];
  theirWishlist: WishlistItem[];
  onReveal: () => void;
  revealing: boolean;
}) {
  let body;
  if (!detail.my_member_id) body = <P muted>{strings.group.notParticipating}</P>;
  else if (detail.group.status === 'open') body = <P muted>{strings.group.noDraw}</P>;
  else if (!result) body = <Button title={strings.group.reveal} onPress={onReveal} loading={revealing} />;
  else
    body = (
      <>
        <P muted>{strings.group.youGiveTo}</P>
        <H1>{result.receiver_display_name}</H1>
        <H2>{strings.group.theirWishlist}</H2>
        {theirWishlist.length ? <WishlistView items={theirWishlist} /> : <P muted>{strings.group.emptyTheirWishlist}</P>}
      </>
    );
  return (
    <Card>
      <H2>{strings.group.myResult}</H2>
      {body}
    </Card>
  );
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loader = useLoader(() => loadGroup(id));
  const [revealing, setRevealing] = useState(false);
  const [wishText, setWishText] = useState('');
  const [wishUrl, setWishUrl] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!loader.data) {
    return loader.error ? (
      <Screen>
        <ErrorBox message={loader.error} />
        <Button title={strings.common.retry} onPress={loader.reload} />
      </Screen>
    ) : (
      <Loading />
    );
  }

  const { detail, activity, myWishlist, result, theirWishlist } = loader.data;
  const { group } = detail;
  const readOnly = group.archived;
  const wish = wishlistItemSchema.safeParse({ text: wishText, url: wishUrl.trim() || undefined });

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      await loader.reload();
    } catch (e) {
      setActionError(messageOf(e));
    }
  };

  const reveal = async () => {
    setRevealing(true);
    await run(() => revealResult(supabase, id));
    setRevealing(false);
  };

  const addWish = async () => {
    if (!wish.success || !detail.my_member_id) return;
    setSaving(true);
    const position = myWishlist.reduce((max, item) => Math.max(max, item.position), 0) + 1;
    await run(async () => {
      await addWishlistItem(supabase, detail.my_member_id ?? '', wish.data, position);
      setWishText('');
      setWishUrl('');
    });
    setSaving(false);
  };

  return (
    <Screen refreshing={loader.refreshing} onRefresh={loader.reload}>
      <Stack.Screen
        options={{
          title: group.name,
          headerRight: detail.is_owner
            ? () => (
                <Button title={strings.group.manage} variant="ghost" small onPress={() => router.push(`/groups/${id}/manage`)} />
              )
            : undefined,
        }}
      />
      <ErrorBox message={actionError ?? loader.error} />

      <Card>
        <H1>{group.name}</H1>
        <P>{formatEventDate(group.event_date)}</P>
        {group.place ? <P muted>{`${strings.group.place}: ${group.place}`}</P> : null}
        {group.budget_amount !== null ? (
          <P muted>{`${strings.group.budget}: ${formatBudget(group.budget_amount, group.currency)}`}</P>
        ) : null}
        {readOnly ? <P muted>{strings.group.archivedNotice}</P> : null}
      </Card>

      <ResultBlock detail={detail} result={result} theirWishlist={theirWishlist} onReveal={reveal} revealing={revealing} />

      {detail.my_member_id ? (
        <Card>
          <H2>{strings.group.myWishlist}</H2>
          {myWishlist.length ? (
            <WishlistView
              items={myWishlist}
              onDelete={readOnly ? undefined : (itemId) => run(() => deleteWishlistItem(supabase, itemId))}
            />
          ) : (
            <P muted>{strings.group.emptyMyWishlist}</P>
          )}
          {readOnly ? null : myWishlist.length >= 10 ? (
            <P muted>{strings.group.wishLimit}</P>
          ) : (
            <>
              <Field label={strings.group.wishText} value={wishText} onChangeText={setWishText} maxLength={200} />
              <Field
                label={strings.group.wishUrl}
                value={wishUrl}
                onChangeText={setWishUrl}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={500}
              />
              <Button title={strings.group.addWish} onPress={addWish} loading={saving} disabled={!wish.success} />
            </>
          )}
        </Card>
      ) : null}

      <Card>
        <H2>{strings.group.participants}</H2>
        {detail.members.map((m) => (
          <View key={m.id} style={{ gap: 6 }}>
            <P>{m.id === detail.my_member_id ? `${m.display_name} (${strings.group.you})` : m.display_name}</P>
            <Row>
              <Badge
                label={m.claimed ? strings.group.openedLink : strings.group.notOpenedLink}
                tone={m.claimed ? 'success' : 'neutral'}
              />
              {group.status === 'drawn' ? (
                <Badge
                  label={m.result_viewed ? strings.group.viewedResult : strings.group.notViewedResult}
                  tone={m.result_viewed ? 'success' : 'neutral'}
                />
              ) : null}
            </Row>
          </View>
        ))}
      </Card>

      <Card>
        <H2>{strings.group.activity}</H2>
        {activity.length ? (
          activity.map((a) => (
            <View key={a.id}>
              <P>{strings.activity[a.kind](a.member_name ?? '')}</P>
              <Text style={[styles.small, styles.muted]}>{formatDateTime(a.created_at)}</Text>
            </View>
          ))
        ) : (
          <P muted>{strings.group.noActivity}</P>
        )}
      </Card>
    </Screen>
  );
}
