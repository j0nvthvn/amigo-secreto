-- P13: reset_draw borra lo del sorteo y conserva miembros, links, reclamos y listas
begin;
\ir _helpers.psql
select plan(14);

create temp table ctx as select pg_temp.new_user() as owner, pg_temp.new_user(true) as ana;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
update public.members set user_id = (select ana from ctx), claimed_at = now()
where id = pg_temp.member_id((select id from g), 'Persona 1');
insert into public.wishlist_items (member_id, text)
values (pg_temp.member_id((select id from g), 'Persona 1'), 'Bufanda');
create temp table before as
  select array_agg(i.token order by i.token) as tokens,
         array_agg(m.user_id::text order by m.id) filter (where m.user_id is not null) as claims
  from public.members m join public.member_invites i on i.member_id = m.id
  where m.group_id = (select id from g);

select pg_temp.commit((select id from g));
update public.members set result_viewed_at = now() where group_id = (select id from g);
insert into public.messages (assignment_id, direction, body)
select id, 'to_receiver', 'Hola' from public.assignments where group_id = (select id from g);
insert into public.thread_state (member_id, side, muted)
select id, 'giving', true from public.members where group_id = (select id from g);
insert into public.reminders_sent (group_id, kind) values ((select id from g), 'reveal_pending'), ((select id from g), 'event_7d');
create temp table msgs as
  select msg.id from public.messages msg join public.assignments a on a.id = msg.assignment_id
  where a.group_id = (select id from g);
insert into public.reports (group_id, message_id, message_body, reporter_member_id)
select (select id from g), id, 'Hola', pg_temp.member_id((select id from g), 'Persona 1')
from msgs limit 1;
grant select on ctx, g to authenticated;

select pg_temp.login((select ana from ctx));
select throws_ok($$ select public.reset_draw((select id from g)) $$, 'P0001', 'not_owner', 'solo el dueño');
select pg_temp.login((select owner from ctx));
select lives_ok($$ select public.reset_draw((select id from g)) $$, 'el dueño repite el sorteo');
select throws_ok($$ select public.reset_draw((select id from g)) $$,
  'P0001', 'group_not_drawn', 'en open da group_not_drawn');
select pg_temp.logout();

select results_eq($$ select status::text, drawn_at from public.groups where id = (select id from g) $$,
  $$ values ('open', null::timestamptz) $$, 'vuelve a open sin drawn_at');
select is((select count(*) from public.assignments where group_id = (select id from g)), 0::bigint, 'borra las asignaciones');
select is((select count(*) from public.messages where id in (select id from msgs)), 0::bigint, 'borra los mensajes');
select is((select count(*) from public.thread_state ts join public.members m on m.id = ts.member_id
           where m.group_id = (select id from g)), 0::bigint, 'borra thread_state');
select is((select count(*) from public.members where group_id = (select id from g) and result_viewed_at is not null),
  0::bigint, 'borra result_viewed_at');
select results_eq($$ select kind from public.reminders_sent where group_id = (select id from g) $$,
  $$ values ('event_7d') $$, 'borra reveal_pending y conserva los demás recordatorios');
select is((select count(*) from public.members where group_id = (select id from g)), 5::bigint, 'conserva los miembros');
select is(
  (select array_agg(i.token order by i.token) from public.members m join public.member_invites i on i.member_id = m.id
   where m.group_id = (select id from g)),
  (select tokens from before), 'conserva los links');
select is(
  (select array_agg(m.user_id::text order by m.id) filter (where m.user_id is not null)
   from public.members m where m.group_id = (select id from g)),
  (select claims from before), 'conserva los reclamos');
select is((select count(*) from public.wishlist_items where text = 'Bufanda'), 1::bigint, 'conserva las listas');
select results_eq($$ select message_id, message_body from public.reports where group_id = (select id from g) $$,
  $$ values (null::uuid, 'Hola') $$, 'el reporte conserva la copia del texto');

select * from finish();
rollback;
