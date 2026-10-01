import { openInvite, ApiError } from '@amigo/shared/api';
import { strings } from '@amigo/shared/strings';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Card, H2, Loading, P, Screen } from '@/components/ui';
import { ensureSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { messageOf } from '@/lib/use-loader';

const knownErrors = {
  claimed_by_other: { title: strings.invite.claimedByOtherTitle, help: strings.invite.claimedByOtherHelp },
  already_member: { title: strings.invite.alreadyMemberTitle, help: strings.invite.alreadyMemberHelp },
  invalid_token: { title: strings.invite.invalidTitle, help: strings.invite.invalidHelp },
} as const;

type Problem = { title: string; help: string };

export default function OpenInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureSession();
        const result = await openInvite(supabase, token);
        if (active) router.replace(`/groups/${result.group_id}`);
      } catch (e) {
        if (!active) return;
        const code = e instanceof ApiError ? e.code : null;
        setProblem(
          code && code in knownErrors
            ? knownErrors[code as keyof typeof knownErrors]
            : { title: strings.invite.invalidTitle, help: messageOf(e) },
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (!problem) return <Loading />;

  return (
    <Screen>
      <Card>
        <H2>{problem.title}</H2>
        <P>{problem.help}</P>
      </Card>
      <Button title={strings.common.goHome} onPress={() => router.replace('/')} />
    </Screen>
  );
}
