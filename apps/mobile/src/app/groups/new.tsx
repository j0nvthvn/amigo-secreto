import { createGroup } from '@amigo/shared/api';
import { toIsoDate } from '@amigo/shared/format';
import { budgetAmountSchema, groupNameSchema, memberNameSchema } from '@amigo/shared/schemas';
import { strings } from '@amigo/shared/strings';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, DateField, ErrorBox, Field, Screen, SwitchRow } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { messageOf } from '@/lib/use-loader';

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export default function NewGroupScreen() {
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState(inDays(30));
  const [place, setPlace] = useState('');
  const [budget, setBudget] = useState('');
  const [participates, setParticipates] = useState(true);
  const [myName, setMyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const budgetAmount = budget.trim() ? Number(budget.replace(/\D/g, '')) : undefined;
  const valid =
    groupNameSchema.safeParse(name).success &&
    (budgetAmount === undefined || budgetAmountSchema.safeParse(budgetAmount).success) &&
    (!participates || memberNameSchema.safeParse(myName).success);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await createGroup(supabase, {
        name: name.trim(),
        eventDate,
        place: place.trim() || undefined,
        budgetAmount,
        ownerParticipates: participates,
        ownerDisplayName: participates ? myName.trim() : undefined,
      });
      router.replace(`/groups/${id}/manage`);
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ErrorBox message={error} />
      <Field
        label={strings.newGroup.name}
        placeholder={strings.newGroup.namePlaceholder}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <DateField label={strings.newGroup.date} value={eventDate} onChange={setEventDate} minimumDate={new Date()} />
      <Field
        label={`${strings.newGroup.place} (${strings.common.optional})`}
        value={place}
        onChangeText={setPlace}
        maxLength={120}
      />
      <Field
        label={`${strings.newGroup.budget} (${strings.common.optional})`}
        value={budget}
        onChangeText={setBudget}
        keyboardType="number-pad"
      />
      <SwitchRow label={strings.newGroup.participate} value={participates} onValueChange={setParticipates} />
      {participates ? (
        <Field label={strings.newGroup.myName} value={myName} onChangeText={setMyName} maxLength={40} />
      ) : null}
      <Button title={strings.newGroup.create} onPress={submit} loading={busy} disabled={!valid} />
    </Screen>
  );
}
