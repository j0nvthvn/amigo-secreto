-- P12: en drawn no se cambian miembros, exclusiones ni opciones
begin;
\ir _helpers.psql
select plan(5);

create temp table ctx as select pg_temp.new_user() as owner;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
create temp table m as select pg_temp.member_id((select id from g), 'Persona 1') as p1,
                              pg_temp.member_id((select id from g), 'Persona 2') as p2;
select pg_temp.commit((select id from g));
grant select on g, m to authenticated;

select pg_temp.login((select owner from ctx));
select throws_ok($$ select public.add_member((select id from g), 'Nueva') $$,
  'P0001', 'group_not_open', 'add_member');
select throws_ok($$ select public.remove_member((select p1 from m)) $$,
  'P0001', 'group_not_open', 'remove_member');
select throws_ok(
  $$ select public.set_exclusions((select id from g),
       jsonb_build_array(jsonb_build_object('giver', (select p1 from m), 'receiver', (select p2 from m)))) $$,
  'P0001', 'group_not_open', 'set_exclusions');
select throws_ok($$ select public.set_draw_options((select id from g), false, true) $$,
  'P0001', 'group_not_open', 'set_draw_options');
select lives_ok($$ select public.rename_member((select p1 from m), 'Renombrada') $$,
  'renombrar sí se puede hasta el archivado');

select * from finish();
rollback;
