-- M1: edición del grupo, renombrar y quitar miembros, actividad y mis grupos
begin;
\ir _helpers.psql
select plan(15);

create temp table ctx as select pg_temp.new_user() as owner, pg_temp.new_user(true) as ana;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
update public.members set user_id = (select ana from ctx), claimed_at = now()
where id = pg_temp.member_id((select id from g), 'Persona 1');
create temp table m as select
  pg_temp.member_id((select id from g), 'Persona 1') as p1,
  pg_temp.member_id((select id from g), 'Persona 2') as p2;
insert into public.exclusions (group_id, giver_member_id, receiver_member_id)
select (select id from g), (select p2 from m), (select p1 from m);
insert into public.wishlist_items (member_id, text) select (select p2 from m), 'Taza';
grant select on ctx, g, m to authenticated;

select pg_temp.login((select owner from ctx));

-- update_group
select lives_ok($$ select public.update_group((select id from g), 'Familia', current_date + 40, 'Parque', 15000, 'CLP') $$,
  'el dueño edita el grupo');
select throws_ok($$ select public.update_group((select id from g), 'Familia', current_date - 1) $$,
  'P0001', 'invalid_input', 'no puede mover la fecha al pasado');
select throws_ok($$ select public.update_group((select id from g), 'Familia', current_date + 40, null, -1) $$,
  'P0001', 'invalid_input', 'presupuesto negativo');

-- rename_member
select lives_ok($$ select public.rename_member((select p2 from m), 'Camila') $$, 'renombra a un miembro');
select throws_ok($$ select public.rename_member((select p1 from m), 'CAMILA') $$,
  'P0001', 'name_taken', 'renombrar a un nombre ocupado da name_taken');
select lives_ok($$ select public.rename_member((select p2 from m), 'camila') $$,
  'puede cambiar solo las mayúsculas de su propio nombre');

-- remove_member
select lives_ok($$ select public.remove_member((select p2 from m)) $$, 'quita a un miembro');

-- get_activity
select results_eq(
  $$ select kind::text, member_name from public.get_activity((select id from g)) $$,
  $$ values ('member_removed', 'camila'), ('member_renamed', 'camila'), ('member_renamed', 'Camila') $$,
  'la actividad muestra las acciones, más recientes primero');
select is((select count(*) from public.get_activity((select id from g), null, 1)), 1::bigint, 'respeta el límite');

-- get_my_groups para un miembro que no es dueño
select pg_temp.login((select ana from ctx));
select results_eq(
  $$ select name, is_owner, archived, unread from public.get_my_groups() $$,
  $$ values ('Familia', false, false, 0) $$,
  'el miembro ve el grupo en sus grupos');

-- Archivado: 7 días después del evento
select pg_temp.logout();
select is((select count(*) from public.exclusions where group_id = (select id from g)), 0::bigint,
  'quitar un miembro borra sus exclusiones');
select is((select count(*) from public.wishlist_items where member_id = (select p2 from m)), 0::bigint,
  'y su lista de deseos');
update public.groups set event_date = current_date - 7 where id = (select id from g);
select pg_temp.login((select owner from ctx));
select throws_ok($$ select public.update_group((select id from g), 'Otro', current_date - 7) $$,
  'P0001', 'group_archived', 'un grupo archivado no se edita');
select throws_ok($$ select public.rename_member((select p1 from m), 'Ana') $$,
  'P0001', 'group_archived', 'ni se renombran miembros');
select lives_ok($$ select public.delete_group((select id from g)) $$, 'pero sí se puede eliminar');

select * from finish();
rollback;
