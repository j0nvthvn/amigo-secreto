/**
 * Pruebas de integración de la Edge Function draw-group contra Supabase local.
 * Requiere `supabase start` y `supabase functions serve`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admin, anonymousUser, createGroup, googleUser, type Client } from './local';

async function drawGroup(client: Client, groupId: string, dryRun: boolean): Promise<unknown> {
  const { data, error } = await client.functions.invoke('draw-group', {
    body: { group_id: groupId, dry_run: dryRun },
  });
  if (error) throw error;
  return data;
}

async function drawState(groupId: string) {
  const [group, assignments, events] = await Promise.all([
    admin.from('groups').select('status').eq('id', groupId).single(),
    admin.from('assignments').select('id', { count: 'exact', head: true }).eq('group_id', groupId),
    admin.from('group_events').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('kind', 'draw_done'),
  ]);
  return { status: group.data?.status, assignments: assignments.count, drawEvents: events.count };
}

const four = ['Ana', 'Bruno', 'Camila', 'Diego'];

test('sin ser dueño responde not_owner', async () => {
  const owner = await googleUser();
  const { groupId } = await createGroup(owner, four);

  for (const other of [await googleUser(), await anonymousUser()]) {
    assert.deepEqual(await drawGroup(other, groupId, true), { ok: false, code: 'not_owner' });
  }
  assert.deepEqual(await drawState(groupId), { status: 'open', assignments: 0, drawEvents: 0 });
});

test('dry_run valida sin escribir nada', async () => {
  const owner = await googleUser();
  const { groupId } = await createGroup(owner, four);

  assert.deepEqual(await drawGroup(owner, groupId, true), { ok: true });
  assert.deepEqual(await drawState(groupId), { status: 'open', assignments: 0, drawEvents: 0 });
});

test('con 3 miembros responde too_few_members', async () => {
  const owner = await googleUser();
  const { groupId } = await createGroup(owner, ['Ana', 'Bruno']);

  const res = await drawGroup(owner, groupId, true);
  assert.equal((res as { code: string }).code, 'too_few_members');
  assert.equal((res as { ok: boolean }).ok, false);
});

test('exclusiones imposibles responden draw_impossible con el nombre real', async () => {
  const owner = await googleUser();
  const { groupId, memberIds } = await createGroup(owner, four);
  const camila = memberIds.get('Camila');
  const others = [...memberIds.values()].filter((id) => id !== camila);
  const { data: group } = await owner.rpc('get_group', { p_group_id: groupId });
  const ownerMember = (group as { my_member_id: string }).my_member_id;

  const { error } = await owner.rpc('set_exclusions', {
    p_group_id: groupId,
    p_pairs: [...others, ownerMember].map((receiver) => ({ giver: camila, receiver })),
  });
  assert.equal(error, null);

  for (const dryRun of [true, false]) {
    const res = (await drawGroup(owner, groupId, dryRun)) as { ok: boolean; code: string; message: string };
    assert.equal(res.ok, false);
    assert.equal(res.code, 'draw_impossible');
    assert.match(res.message, /Camila no tiene a quién regalarle/);
  }
  assert.deepEqual(await drawState(groupId), { status: 'open', assignments: 0, drawEvents: 0 });
});

test('sortea, guarda y nunca devuelve las asignaciones', async () => {
  const owner = await googleUser();
  const { groupId } = await createGroup(owner, four);

  assert.deepEqual(await drawGroup(owner, groupId, false), { ok: true });
  assert.deepEqual(await drawState(groupId), { status: 'drawn', assignments: 5, drawEvents: 1 });
  assert.deepEqual(await drawGroup(owner, groupId, true), { ok: false, code: 'group_not_open' });
});

test('dos llamadas simultáneas generan un solo sorteo', async () => {
  const owner = await googleUser();
  const { groupId } = await createGroup(owner, four);

  const results = await Promise.all([drawGroup(owner, groupId, false), drawGroup(owner, groupId, false)]);
  const ok = results.filter((r) => (r as { ok: boolean }).ok);
  assert.equal(ok.length, 1, JSON.stringify(results));
  assert.ok(results.some((r) => (r as { code?: string }).code === 'group_not_open'));
  assert.deepEqual(await drawState(groupId), { status: 'drawn', assignments: 5, drawEvents: 1 });
});
