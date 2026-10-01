import {
  addWishlistItem,
  ApiError,
  deleteWishlistItem,
  getActivity,
  getGroup,
  getWishlist,
  openInvite,
  revealResult,
  type ActivityItem,
  type GroupDetail,
  type RevealResult,
  type WishlistItem,
} from '@amigo/shared/api';
import { errorText } from '@amigo/shared/errors';
import { formatBudget, formatDateTime, formatEventDate } from '@amigo/shared/format';
import { wishlistItemSchema } from '@amigo/shared/schemas';
import { strings } from '@amigo/shared/strings';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Card, ErrorBox, Layout } from '../components/Layout';
import { ensureSession, supabase } from '../lib/supabase';

interface GroupView {
  detail: GroupDetail;
  activity: ActivityItem[];
  myWishlist: WishlistItem[];
  result: RevealResult | null;
  theirWishlist: WishlistItem[];
}

type State =
  | { kind: 'loading' }
  | { kind: 'problem'; title: string; help: string }
  | { kind: 'ready'; groupId: string; view: GroupView };

const problems: Partial<Record<string, { title: string; help: string }>> = {
  claimed_by_other: { title: strings.invite.claimedByOtherTitle, help: strings.invite.claimedByOtherHelp },
  already_member: { title: strings.invite.alreadyMemberTitle, help: strings.invite.alreadyMemberHelp },
  invalid_token: { title: strings.invite.invalidTitle, help: strings.invite.invalidHelp },
};

function messageOf(e: unknown): string {
  return e instanceof ApiError ? e.message : errorText(e);
}

async function loadGroup(groupId: string): Promise<GroupView> {
  const detail = await getGroup(supabase, groupId);
  const me = detail.members.find((m) => m.id === detail.my_member_id);
  const [activity, myWishlist] = await Promise.all([
    getActivity(supabase, groupId),
    me ? getWishlist(supabase, me.id) : Promise.resolve([]),
  ]);
  const result = detail.group.status === 'drawn' && me?.result_viewed ? await revealResult(supabase, groupId) : null;
  const theirWishlist = result ? await getWishlist(supabase, result.receiver_member_id) : [];
  return { detail, activity, myWishlist, result, theirWishlist };
}

/** En Android abre la app si está instalada; si no, la ficha de Google Play. */
function appIntentUrl(token: string): string {
  return `intent://${window.location.host}/r/${token}#Intent;scheme=https;package=tech.jflores.tetoco;end`;
}

function Wishlist({ items, onDelete }: { items: WishlistItem[]; onDelete?: (id: string) => void }) {
  return (
    <ul className="wishlist">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <span>{item.text}</span>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="wish-url">
                {item.url}
              </a>
            ) : null}
          </div>
          {onDelete ? (
            <button type="button" className="link-button" onClick={() => onDelete(item.id)}>
              {strings.common.delete}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function InvitePage({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wishText, setWishText] = useState('');
  const [wishUrl, setWishUrl] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureSession();
        const { group_id } = await openInvite(supabase, token);
        const view = await loadGroup(group_id);
        if (active) setState({ kind: 'ready', groupId: group_id, view });
      } catch (e) {
        if (!active) return;
        const known = e instanceof ApiError && e.code ? problems[e.code] : undefined;
        setState({ kind: 'problem', ...(known ?? { title: strings.invite.invalidTitle, help: messageOf(e) }) });
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const groupId = state.kind === 'ready' ? state.groupId : null;
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      if (!groupId) return false;
      setBusy(true);
      setActionError(null);
      try {
        await action();
        setState({ kind: 'ready', groupId, view: await loadGroup(groupId) });
        return true;
      } catch (e) {
        setActionError(messageOf(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [groupId],
  );

  if (state.kind === 'loading') {
    return (
      <Layout>
        <p className="muted center">{strings.invite.opening}</p>
      </Layout>
    );
  }

  if (state.kind === 'problem') {
    return (
      <Layout>
        <Card>
          <h1>{state.title}</h1>
          <p>{state.help}</p>
        </Card>
      </Layout>
    );
  }

  const { detail, activity, myWishlist, result, theirWishlist } = state.view;
  const { group } = detail;
  const readOnly = group.archived;
  const wish = wishlistItemSchema.safeParse({ text: wishText, url: wishUrl.trim() || undefined });
  const isAndroid = /android/i.test(navigator.userAgent);

  const addWish = async (event: FormEvent) => {
    event.preventDefault();
    if (!wish.success || !detail.my_member_id) return;
    const memberId = detail.my_member_id;
    const position = myWishlist.reduce((max, item) => Math.max(max, item.position), 0) + 1;
    const ok = await run(() => addWishlistItem(supabase, memberId, wish.data, position));
    if (ok) {
      setWishText('');
      setWishUrl('');
    }
  };

  return (
    <Layout>
      {isAndroid ? (
        <Card className="banner">
          <p>{strings.web.openInAppHelp}</p>
          <a className="button secondary" href={appIntentUrl(token)}>
            {strings.web.openInApp}
          </a>
        </Card>
      ) : null}

      <ErrorBox message={actionError} />

      <Card>
        <h1>{group.name}</h1>
        <p>{formatEventDate(group.event_date)}</p>
        {group.place ? <p className="muted">{`${strings.group.place}: ${group.place}`}</p> : null}
        {group.budget_amount !== null ? (
          <p className="muted">{`${strings.group.budget}: ${formatBudget(group.budget_amount, group.currency)}`}</p>
        ) : null}
        {readOnly ? <p className="muted">{strings.group.archivedNotice}</p> : null}
      </Card>

      <Card className="result">
        <h2>{strings.group.myResult}</h2>
        {!detail.my_member_id ? (
          <p className="muted">{strings.group.notParticipating}</p>
        ) : group.status === 'open' ? (
          <p className="muted">{strings.group.noDraw}</p>
        ) : !result ? (
          <button type="button" className="button" disabled={busy} onClick={() => run(() => revealResult(supabase, group.id))}>
            {strings.group.reveal}
          </button>
        ) : (
          <>
            <p className="muted">{strings.group.youGiveTo}</p>
            <p className="receiver">{result.receiver_display_name}</p>
            <h3>{strings.group.theirWishlist}</h3>
            {theirWishlist.length ? <Wishlist items={theirWishlist} /> : <p className="muted">{strings.group.emptyTheirWishlist}</p>}
          </>
        )}
      </Card>

      {detail.my_member_id ? (
        <Card>
          <h2>{strings.group.myWishlist}</h2>
          {myWishlist.length ? (
            <Wishlist
              items={myWishlist}
              onDelete={readOnly ? undefined : (id) => void run(() => deleteWishlistItem(supabase, id))}
            />
          ) : (
            <p className="muted">{strings.group.emptyMyWishlist}</p>
          )}
          {readOnly ? null : myWishlist.length >= 10 ? (
            <p className="muted">{strings.group.wishLimit}</p>
          ) : (
            <form className="form" onSubmit={addWish}>
              <label>
                {strings.group.wishText}
                <input value={wishText} onChange={(e) => setWishText(e.target.value)} maxLength={200} />
              </label>
              <label>
                {strings.group.wishUrl}
                <input
                  value={wishUrl}
                  onChange={(e) => setWishUrl(e.target.value)}
                  maxLength={500}
                  inputMode="url"
                  autoCapitalize="none"
                />
              </label>
              <button type="submit" className="button" disabled={!wish.success || busy}>
                {strings.group.addWish}
              </button>
            </form>
          )}
        </Card>
      ) : null}

      <Card>
        <h2>{strings.group.participants}</h2>
        <ul className="members">
          {detail.members.map((m) => (
            <li key={m.id}>
              <span>{m.id === detail.my_member_id ? `${m.display_name} (${strings.group.you})` : m.display_name}</span>
              <span className="badges">
                <span className={`badge ${m.claimed ? 'ok' : ''}`}>
                  {m.claimed ? strings.group.openedLink : strings.group.notOpenedLink}
                </span>
                {group.status === 'drawn' ? (
                  <span className={`badge ${m.result_viewed ? 'ok' : ''}`}>
                    {m.result_viewed ? strings.group.viewedResult : strings.group.notViewedResult}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2>{strings.group.activity}</h2>
        {activity.length ? (
          <ul className="activity">
            {activity.map((a) => (
              <li key={a.id}>
                <span>{strings.activity[a.kind](a.member_name ?? '')}</span>
                <time className="muted">{formatDateTime(a.created_at)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{strings.group.noActivity}</p>
        )}
      </Card>
    </Layout>
  );
}
