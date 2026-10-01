import {
  addMember,
  deleteGroup,
  drawGroup,
  getExclusions,
  getGroup,
  getInviteLinks,
  regenerateInvite,
  removeMember,
  renameMember,
  resetDraw,
  setDrawOptions,
  setExclusions,
  updateGroup,
  type ExclusionPair,
  type GroupInfo,
  type InviteLink,
} from '@amigo/shared/api';
import { inviteUrl } from '@amigo/shared/links';
import { groupNameSchema, memberNameSchema } from '@amigo/shared/schemas';
import { strings } from '@amigo/shared/strings';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  ChipSelect,
  DateField,
  ErrorBox,
  Field,
  H2,
  Loading,
  P,
  Row,
  Screen,
  SwitchRow,
} from '@/components/ui';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { messageOf, useLoader } from '@/lib/use-loader';

async function loadManage(groupId: string) {
  const [detail, links, exclusions] = await Promise.all([
    getGroup(supabase, groupId),
    getInviteLinks(supabase, groupId),
    getExclusions(supabase, groupId),
  ]);
  return { detail, links, exclusions };
}

function confirm(message: string, action: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(strings.appName, message, [
      { text: strings.common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]),
  );
}

function sameExclusion(a: ExclusionPair, b: ExclusionPair) {
  return a.giver === b.giver && a.receiver === b.receiver;
}

/** Formulario de detalles. Se reinicia con `key` cuando cambian los datos guardados. */
function DetailsCard({
  group,
  editable,
  saving,
  onSave,
}: {
  group: GroupInfo;
  editable: boolean;
  saving: boolean;
  onSave: (input: { name: string; eventDate: string; place?: string; budgetAmount?: number }) => void;
}) {
  const [name, setName] = useState(group.name);
  const [eventDate, setEventDate] = useState(group.event_date);
  const [place, setPlace] = useState(group.place ?? '');
  const [budget, setBudget] = useState(group.budget_amount === null ? '' : String(group.budget_amount));

  return (
    <Card>
      <H2>{strings.manage.details}</H2>
      <Field label={strings.newGroup.name} value={name} onChangeText={setName} maxLength={60} editable={editable} />
      <DateField label={strings.newGroup.date} value={eventDate} onChange={setEventDate} />
      <Field
        label={`${strings.newGroup.place} (${strings.common.optional})`}
        value={place}
        onChangeText={setPlace}
        maxLength={120}
        editable={editable}
      />
      <Field
        label={`${strings.newGroup.budget} (${strings.common.optional})`}
        value={budget}
        onChangeText={setBudget}
        keyboardType="number-pad"
        editable={editable}
      />
      {editable ? (
        <Button
          title={strings.common.save}
          variant="secondary"
          loading={saving}
          disabled={!groupNameSchema.safeParse(name).success}
          onPress={() =>
            onSave({
              name: name.trim(),
              eventDate,
              place: place.trim() || undefined,
              budgetAmount: budget.trim() ? Number(budget.replace(/\D/g, '')) : undefined,
            })
          }
        />
      ) : null}
    </Card>
  );
}

export default function ManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loader = useLoader(() => loadManage(id));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Participantes
  const [newMember, setNewMember] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  // Exclusiones
  const [giver, setGiver] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<string | null>(null);
  const [couple, setCouple] = useState(true);

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

  const { detail, links, exclusions } = loader.data;
  const { group } = detail;
  const editable = !group.archived;
  const open = group.status === 'open' && editable;
  const nameOf = (memberId: string) => links.find((l) => l.member_id === memberId)?.display_name ?? '?';

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await loader.reload();
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const share = (link: InviteLink, token = link.token) =>
    Share.share({ message: strings.manage.shareMessage(link.display_name, group.name, inviteUrl(env.webOrigin, token)) });

  const add = async () => {
    if (await run('add', () => addMember(supabase, id, newMember.trim()))) setNewMember('');
  };

  const saveRename = async () => {
    if (!renaming) return;
    if (await run(`rename:${renaming.id}`, () => renameMember(supabase, renaming.id, renaming.name.trim()))) {
      setRenaming(null);
    }
  };

  const remove = async (link: InviteLink) => {
    if (await confirm(strings.manage.removeConfirm(link.display_name), strings.manage.remove, true)) {
      await run(`remove:${link.member_id}`, () => removeMember(supabase, link.member_id));
    }
  };

  const regenerate = async (link: InviteLink) => {
    if (!(await confirm(strings.manage.regenerateConfirm(link.display_name), strings.manage.regenerate, true))) return;
    let token = '';
    if (await run(`regen:${link.member_id}`, async () => (token = await regenerateInvite(supabase, link.member_id)))) {
      await share(link, token);
    }
  };

  const addExclusion = () => {
    if (!giver || !receiver || giver === receiver) return;
    const pairs = couple
      ? [
          { giver, receiver },
          { giver: receiver, receiver: giver },
        ]
      : [{ giver, receiver }];
    const next = [...exclusions, ...pairs.filter((p) => !exclusions.some((e) => sameExclusion(e, p)))];
    void run('exclusions', async () => {
      await setExclusions(supabase, id, next);
      setGiver(null);
      setReceiver(null);
    });
  };

  const removeExclusion = (pair: ExclusionPair) =>
    run('exclusions', () => setExclusions(supabase, id, exclusions.filter((e) => !sameExclusion(e, pair))));

  const draw = async () => {
    // Validación previa sin guardar (R18): si hay error, se muestra y no se pregunta nada
    if (!(await run('draw', () => drawGroup(supabase, id, true)))) return;
    if (!(await confirm(strings.manage.drawConfirm, strings.manage.draw))) return;
    if (await run('draw', () => drawGroup(supabase, id, false))) Alert.alert(strings.appName, strings.manage.drawDone);
  };

  const reset = async () => {
    if (await confirm(strings.manage.resetConfirm, strings.manage.reset, true)) {
      await run('reset', () => resetDraw(supabase, id));
    }
  };

  const removeGroup = async () => {
    if (await confirm(strings.manage.deleteConfirm, strings.manage.deleteGroup, true)) {
      setBusy('delete');
      try {
        await deleteGroup(supabase, id);
        router.dismissAll();
        router.replace('/');
      } catch (e) {
        setError(messageOf(e));
        setBusy(null);
      }
    }
  };

  const memberOptions = links.map((l) => ({ value: l.member_id, label: l.display_name }));

  return (
    <Screen refreshing={loader.refreshing} onRefresh={loader.reload}>
      <ErrorBox message={error ?? loader.error} />

      <DetailsCard
        key={`${group.name}|${group.event_date}|${group.place}|${group.budget_amount}`}
        group={group}
        editable={editable}
        saving={busy === 'details'}
        onSave={(input) => run('details', () => updateGroup(supabase, id, { ...input, currency: group.currency }))}
      />

      <Card>
        <H2>{strings.manage.participants}</H2>
        {group.status === 'drawn' ? <P muted>{strings.manage.lockedAfterDraw}</P> : null}
        {links.map((link) => (
          <View key={link.member_id} style={{ gap: 8 }}>
            {renaming?.id === link.member_id ? (
              <>
                <Field
                  label={strings.manage.rename}
                  value={renaming.name}
                  onChangeText={(t) => setRenaming({ id: link.member_id, name: t })}
                  maxLength={40}
                  autoFocus
                />
                <Row>
                  <Button
                    title={strings.common.save}
                    small
                    onPress={saveRename}
                    loading={busy === `rename:${link.member_id}`}
                    disabled={!memberNameSchema.safeParse(renaming.name).success}
                  />
                  <Button title={strings.common.cancel} small variant="secondary" onPress={() => setRenaming(null)} />
                </Row>
              </>
            ) : (
              <>
                <P>{link.display_name}</P>
                <Row>
                  <Badge
                    label={link.claimed ? strings.group.openedLink : strings.group.notOpenedLink}
                    tone={link.claimed ? 'success' : 'neutral'}
                  />
                  {group.status === 'drawn' ? (
                    <Badge
                      label={link.result_viewed ? strings.group.viewedResult : strings.group.notViewedResult}
                      tone={link.result_viewed ? 'success' : 'neutral'}
                    />
                  ) : null}
                </Row>
                {editable ? (
                  <Row>
                    <Button title={strings.manage.share} small onPress={() => share(link)} />
                    <Button
                      title={strings.manage.rename}
                      small
                      variant="secondary"
                      onPress={() => setRenaming({ id: link.member_id, name: link.display_name })}
                    />
                    <Button
                      title={strings.manage.regenerate}
                      small
                      variant="secondary"
                      onPress={() => regenerate(link)}
                      loading={busy === `regen:${link.member_id}`}
                    />
                    {open ? (
                      <Button
                        title={strings.manage.remove}
                        small
                        variant="ghost"
                        onPress={() => remove(link)}
                        loading={busy === `remove:${link.member_id}`}
                      />
                    ) : null}
                  </Row>
                ) : null}
              </>
            )}
          </View>
        ))}
        {open ? (
          <>
            <Field
              label={strings.manage.add}
              placeholder={strings.manage.addPlaceholder}
              value={newMember}
              onChangeText={setNewMember}
              maxLength={40}
            />
            <Button
              title={strings.manage.add}
              onPress={add}
              loading={busy === 'add'}
              disabled={!memberNameSchema.safeParse(newMember).success}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <H2>{strings.manage.exclusions}</H2>
        <P muted>{strings.manage.exclusionsHelp}</P>
        {exclusions.length ? (
          exclusions.map((e) => (
            <Row key={`${e.giver}-${e.receiver}`}>
              <View style={{ flex: 1 }}>
                <P>{strings.manage.exclusionRow(nameOf(e.giver), nameOf(e.receiver))}</P>
              </View>
              {open ? (
                <Button title={strings.common.delete} small variant="ghost" onPress={() => removeExclusion(e)} />
              ) : null}
            </Row>
          ))
        ) : (
          <P muted>{strings.manage.noExclusions}</P>
        )}
        {open && links.length >= 2 ? (
          <>
            <P>{strings.manage.giver}</P>
            <ChipSelect options={memberOptions} value={giver} onChange={setGiver} />
            <P>{strings.manage.receiver}</P>
            <ChipSelect options={memberOptions.filter((o) => o.value !== giver)} value={receiver} onChange={setReceiver} />
            <SwitchRow label={strings.manage.couple} value={couple} onValueChange={setCouple} />
            <Button
              title={strings.manage.addExclusion}
              variant="secondary"
              onPress={addExclusion}
              loading={busy === 'exclusions'}
              disabled={!giver || !receiver || giver === receiver}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <H2>{strings.manage.options}</H2>
        <SwitchRow
          label={strings.manage.singleCycle}
          help={strings.manage.singleCycleHelp}
          value={group.single_cycle}
          disabled={!open || busy !== null}
          onValueChange={(v) => run('options', () => setDrawOptions(supabase, id, group.avoid_mutual, v))}
        />
        {/* Con una sola cadena, evitar pares mutuos no aplica (R15) */}
        {group.single_cycle ? null : (
          <SwitchRow
            label={strings.manage.avoidMutual}
            help={strings.manage.avoidMutualHelp}
            value={group.avoid_mutual}
            disabled={!open || busy !== null}
            onValueChange={(v) => run('options', () => setDrawOptions(supabase, id, v, group.single_cycle))}
          />
        )}
      </Card>

      {open ? <Button title={strings.manage.draw} onPress={draw} loading={busy === 'draw'} /> : null}
      {group.status === 'drawn' && editable ? (
        <Button title={strings.manage.reset} variant="secondary" onPress={reset} loading={busy === 'reset'} />
      ) : null}
      <Button title={strings.manage.deleteGroup} variant="danger" onPress={removeGroup} loading={busy === 'delete'} />
    </Screen>
  );
}
