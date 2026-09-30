-- P11: tras sortear, cada miembro y el dueño llaman a reveal_result y reciben solo su propia persona
begin;
\ir _helpers.psql
select plan(10);

create temp table ctx as select pg_temp.new_user() as owner, pg_temp.new_user() as solo_owner;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;

-- Los 4 miembros no dueños quedan reclamados por usuarios anónimos
create temp table users as
  select m.id as member_id, pg_temp.new_user(true) as uid
  from public.members m where m.group_id = (select id from g) and m.user_id is null;
update public.members m set user_id = u.uid, claimed_at = now() from users u where m.id = u.member_id;
insert into users select pg_temp.member_id((select id from g), 'Dueño'), (select owner from ctx);
grant select on ctx, g, users to authenticated;

select pg_temp.login((select owner from ctx));
select throws_ok($$ select public.reveal_result((select id from g)) $$,
  'P0001', 'group_not_drawn', 'antes del sorteo da group_not_drawn');
select pg_temp.logout();
select pg_temp.commit((select id from g));

create temp table revealed (member_id uuid, result jsonb);
grant insert, select on revealed to authenticated;
do $$
declare
  u record;
begin
  for u in select * from users loop
    perform pg_temp.login(u.uid);
    insert into revealed values (u.member_id, public.reveal_result((select id from g)));
  end loop;
  perform pg_temp.logout();
end;
$$;

select is((select count(*) from revealed), 5::bigint, 'los 5 revelan');
select is(
  (select count(*) from revealed r join public.assignments a on a.giver_member_id = r.member_id
   where a.receiver_member_id = (r.result ->> 'receiver_member_id')::uuid
     and (r.result ->> 'receiver_display_name') =
         (select display_name from public.members where id = a.receiver_member_id)),
  5::bigint, 'cada uno recibe exactamente su propia asignación');
select is((select count(distinct result -> 'receiver_member_id') from revealed), 5::bigint,
  'todos reciben personas distintas');
select is((select array_agg(distinct key order by key) from revealed, jsonb_object_keys(result) key),
  array['receiver_display_name', 'receiver_member_id'], 'la respuesta solo trae la persona que le toca');
select is((select count(*) from public.members where group_id = (select id from g) and result_viewed_at is not null),
  5::bigint, 'se fija result_viewed_at');
select is((select count(*) from public.group_events where group_id = (select id from g) and kind = 'result_viewed'),
  5::bigint, 'un evento result_viewed por persona');

-- Revelar otra vez no crea otro evento
select pg_temp.login((select uid from users limit 1));
select lives_ok($$ select public.reveal_result((select id from g)) $$, 'revelar otra vez funciona');
select pg_temp.logout();
select is((select count(*) from public.group_events where group_id = (select id from g) and kind = 'result_viewed'),
  5::bigint, 'y no repite el evento');

-- Un dueño que no participa no tiene resultado
create temp table curso as
  with ins as (
    insert into public.groups (owner_id, name, event_date, status)
    values ((select solo_owner from ctx), 'Curso', current_date + 3, 'drawn')
    returning id)
  select id from ins;
grant select on curso to authenticated;
select pg_temp.login((select solo_owner from ctx));
select throws_ok(
  $$ select public.reveal_result((select id from curso)) $$,
  'P0001', 'not_member', 'el dueño que no participa recibe not_member');

select * from finish();
rollback;
