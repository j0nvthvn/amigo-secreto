/**
 * Funciones tipadas sobre las RPC y Edge Functions. Las usan la app y la web.
 * Todo error de la API se lanza como ApiError con su código (packages/shared/errors.ts).
 */
import type { Database, Json } from './database.types';
import { errorMessages, errorText, toErrorCode, type ErrorCode } from './errors';
import type { AppSupabaseClient } from './supabase';

type Enums = Database['public']['Enums'];
export type GroupStatus = Enums['group_status'];
export type GroupEventKind = Enums['group_event_kind'];

export class ApiError extends Error {
  readonly code: ErrorCode | null;

  constructor(code: ErrorCode | null, message?: string) {
    super(message ?? (code ? errorMessages[code] : errorText(null)));
    this.name = 'ApiError';
    this.code = code;
  }
}

function fail(error: unknown): never {
  throw new ApiError(toErrorCode(error));
}

/** Supabase devuelve data nula solo cuando hay error, o cuando la RPC no devuelve nada. */
function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) fail(result.error);
  return result.data as T;
}

// ---------------------------------------------------------------------------
// Tipos de las respuestas JSON
// ---------------------------------------------------------------------------

export interface GroupInfo {
  id: string;
  name: string;
  event_date: string;
  timezone: string;
  place: string | null;
  budget_amount: number | null;
  currency: string;
  status: GroupStatus;
  avoid_mutual: boolean;
  single_cycle: boolean;
  drawn_at: string | null;
  created_at: string;
  archived: boolean;
}

export interface MemberSummary {
  id: string;
  display_name: string;
  claimed: boolean;
  result_viewed: boolean;
}

export interface BySide<T> {
  giving: T;
  receiving: T;
}

export interface GroupDetail {
  group: GroupInfo;
  is_owner: boolean;
  my_member_id: string | null;
  members: MemberSummary[];
  unread: BySide<number> | null;
  muted: BySide<boolean> | null;
}

export interface MyGroup {
  group_id: string;
  name: string;
  event_date: string;
  status: GroupStatus;
  is_owner: boolean;
  archived: boolean;
  unread: number;
}

export interface ActivityItem {
  id: number;
  kind: GroupEventKind;
  member_name: string | null;
  created_at: string;
}

export interface InviteLink {
  member_id: string;
  display_name: string;
  token: string;
  claimed: boolean;
  result_viewed: boolean;
}

export interface OpenInviteResult {
  group_id: string;
  member_id: string;
  status: 'claimed' | 'already_yours';
}

export interface RevealResult {
  receiver_member_id: string;
  receiver_display_name: string;
}

export interface ExclusionPair {
  giver: string;
  receiver: string;
}

export interface WishlistItem {
  id: string;
  member_id: string;
  text: string;
  url: string | null;
  position: number;
}

export interface NewGroupInput {
  name: string;
  eventDate: string;
  place?: string;
  budgetAmount?: number;
  currency?: string;
  ownerParticipates: boolean;
  ownerDisplayName?: string;
}

export interface GroupDetailsInput {
  name: string;
  eventDate: string;
  place?: string;
  budgetAmount?: number;
  currency?: string;
}

// ---------------------------------------------------------------------------
// Grupos
// ---------------------------------------------------------------------------

export async function getMyGroups(c: AppSupabaseClient): Promise<MyGroup[]> {
  return unwrap(await c.rpc('get_my_groups'));
}

export async function getGroup(c: AppSupabaseClient, groupId: string): Promise<GroupDetail> {
  return unwrap(await c.rpc('get_group', { p_group_id: groupId })) as unknown as GroupDetail;
}

export async function getActivity(c: AppSupabaseClient, groupId: string, beforeId?: number): Promise<ActivityItem[]> {
  return unwrap(await c.rpc('get_activity', { p_group_id: groupId, p_before_id: beforeId }));
}

export async function createGroup(c: AppSupabaseClient, input: NewGroupInput): Promise<string> {
  return unwrap(
    await c.rpc('create_group', {
      p_name: input.name,
      p_event_date: input.eventDate,
      p_place: input.place,
      p_budget_amount: input.budgetAmount,
      p_currency: input.currency,
      p_owner_participates: input.ownerParticipates,
      p_owner_display_name: input.ownerDisplayName,
    }),
  );
}

export async function updateGroup(c: AppSupabaseClient, groupId: string, input: GroupDetailsInput): Promise<void> {
  unwrap(
    await c.rpc('update_group', {
      p_group_id: groupId,
      p_name: input.name,
      p_event_date: input.eventDate,
      p_place: input.place,
      p_budget_amount: input.budgetAmount,
      p_currency: input.currency,
    }),
  );
}

export async function deleteGroup(c: AppSupabaseClient, groupId: string): Promise<void> {
  unwrap(await c.rpc('delete_group', { p_group_id: groupId }));
}

// ---------------------------------------------------------------------------
// Miembros y links
// ---------------------------------------------------------------------------

export async function addMember(c: AppSupabaseClient, groupId: string, displayName: string): Promise<{ member_id: string; token: string }> {
  return unwrap(await c.rpc('add_member', { p_group_id: groupId, p_display_name: displayName })) as unknown as {
    member_id: string;
    token: string;
  };
}

export async function renameMember(c: AppSupabaseClient, memberId: string, displayName: string): Promise<void> {
  unwrap(await c.rpc('rename_member', { p_member_id: memberId, p_display_name: displayName }));
}

export async function removeMember(c: AppSupabaseClient, memberId: string): Promise<void> {
  unwrap(await c.rpc('remove_member', { p_member_id: memberId }));
}

export async function getInviteLinks(c: AppSupabaseClient, groupId: string): Promise<InviteLink[]> {
  return unwrap(await c.rpc('get_invite_links', { p_group_id: groupId }));
}

export async function regenerateInvite(c: AppSupabaseClient, memberId: string): Promise<string> {
  return unwrap(await c.rpc('regenerate_invite', { p_member_id: memberId }));
}

export async function openInvite(c: AppSupabaseClient, token: string): Promise<OpenInviteResult> {
  return unwrap(await c.rpc('open_invite', { p_token: token })) as unknown as OpenInviteResult;
}

// ---------------------------------------------------------------------------
// Sorteo
// ---------------------------------------------------------------------------

export async function getExclusions(c: AppSupabaseClient, groupId: string): Promise<ExclusionPair[]> {
  const rows = unwrap(await c.rpc('get_exclusions', { p_group_id: groupId }));
  return rows.map((r) => ({ giver: r.giver_member_id, receiver: r.receiver_member_id }));
}

export async function setExclusions(c: AppSupabaseClient, groupId: string, pairs: ExclusionPair[]): Promise<void> {
  unwrap(await c.rpc('set_exclusions', { p_group_id: groupId, p_pairs: pairs as unknown as Json }));
}

export async function setDrawOptions(c: AppSupabaseClient, groupId: string, avoidMutual: boolean, singleCycle: boolean): Promise<void> {
  unwrap(await c.rpc('set_draw_options', { p_group_id: groupId, p_avoid_mutual: avoidMutual, p_single_cycle: singleCycle }));
}

export async function resetDraw(c: AppSupabaseClient, groupId: string): Promise<void> {
  unwrap(await c.rpc('reset_draw', { p_group_id: groupId }));
}

export async function revealResult(c: AppSupabaseClient, groupId: string): Promise<RevealResult> {
  return unwrap(await c.rpc('reveal_result', { p_group_id: groupId })) as unknown as RevealResult;
}

/**
 * Llama a la Edge Function draw-group. Con dryRun solo valida.
 * Los errores de negocio llegan con su mensaje (en draw_impossible, con los nombres reales).
 */
export async function drawGroup(c: AppSupabaseClient, groupId: string, dryRun: boolean): Promise<void> {
  const { data, error } = await c.functions.invoke<{ ok: boolean; code?: string; message?: string }>('draw-group', {
    body: { group_id: groupId, dry_run: dryRun },
  });
  if (error) fail(error);
  if (!data?.ok) {
    const code = toErrorCode(data);
    throw new ApiError(code, code === 'draw_impossible' && data?.message ? data.message : undefined);
  }
}

// ---------------------------------------------------------------------------
// Lista de deseos (única tabla con acceso directo, protegida por RLS)
// ---------------------------------------------------------------------------

export async function getWishlist(c: AppSupabaseClient, memberId: string): Promise<WishlistItem[]> {
  const rows = unwrap(
    await c
      .from('wishlist_items')
      .select('id, member_id, text, url, position')
      .eq('member_id', memberId)
      .order('position')
      .order('created_at'),
  );
  return rows;
}

export async function addWishlistItem(
  c: AppSupabaseClient,
  memberId: string,
  item: { text: string; url?: string },
  position: number,
): Promise<void> {
  unwrap(await c.from('wishlist_items').insert({ member_id: memberId, text: item.text, url: item.url ?? null, position }));
}

export async function deleteWishlistItem(c: AppSupabaseClient, itemId: string): Promise<void> {
  unwrap(await c.from('wishlist_items').delete().eq('id', itemId));
}
