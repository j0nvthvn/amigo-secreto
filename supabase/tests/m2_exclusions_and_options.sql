-- M2: exclusiones, opciones del sorteo y que commit_draw respete las opciones
begin;
\ir _helpers.psql
select plan(12);

create temp table ctx as select pg_temp.new_user() as owner, pg_temp.new_user() as other_owner;
create temp table g as select pg_temp.new_group((select owner from ctx), 3) as id;
create temp table g2 as select pg_temp.new_group((select other_owner from ctx), 3) as id;
create temp table m as select
  pg_temp.member_id((select id from g), 'Dueño') as d,
  pg_temp.member_id((select id from g), 'Persona 1') as p1,
  pg_temp.member_id((select id from g), 'Persona 2') as p2,
  pg_temp.member_id((select id from g), 'Persona 3') as p3,
  pg_temp.member_id((select id from g2), 'Persona 1') as foreign_member;
grant select on ctx, g, g2, m to authenticated;

select pg_temp.login((select owner from ctx));

-- Pareja: ambas direcciones, con un duplicado que se ignora
select lives_ok($$ select public.set_exclusions((select id from g), jsonb_build_array(
  jsonb_build_object('giver', (select p1 from m), 'receiver', (select p2 from m)),
  jsonb_build_object('giver', (select p2 from m), 'receiver', (select p1 from m)),
  jsonb_build_object('giver', (select p2 from m), 'receiver', (select p1 from m)))) $$,
  'guarda una pareja');
select is((select count(*) from public.get_exclusions((select id from g))), 2::bigint, 'dos exclusiones, sin duplicados');

select throws_ok($$ select public.set_exclusions((select id from g), jsonb_build_array(
  jsonb_build_object('giver', (select p1 from m), 'receiver', (select foreign_member from m)))) $$,
  'P0001', 'invalid_input', 'un miembro de otro grupo da invalid_input');
select throws_ok($$ select public.set_exclusions((select id from g), jsonb_build_array(
  jsonb_build_object('giver', (select p1 from m), 'receiver', (select p1 from m)))) $$,
  'P0001', 'invalid_input', 'excluirse a sí mismo da invalid_input');
select throws_ok($$ select public.set_exclusions((select id from g), '{"giver": 1}') $$,
  'P0001', 'invalid_input', 'algo que no es un arreglo da invalid_input');
select is((select count(*) from public.get_exclusions((select id from g))), 2::bigint,
  'un error no cambia las exclusiones guardadas');

select lives_ok($$ select public.set_exclusions((select id from g), '[]') $$, 'un arreglo vacío las borra');
select is((select count(*) from public.get_exclusions((select id from g))), 0::bigint, 'quedan 0');

select pg_temp.login((select other_owner from ctx));
select throws_ok($$ select * from public.get_exclusions((select id from g)) $$,
  'P0001', 'not_owner', 'otro dueño no ve las exclusiones');

-- commit_draw respeta las opciones
select pg_temp.logout();
grant select on g, m to service_role;
select set_config('role', 'service_role', true);
-- Dos pares mutuos: d<->p1 y p2<->p3. avoid_mutual está activado por defecto
select throws_ok($$ select public.commit_draw((select id from g), jsonb_build_array(
  jsonb_build_object('giver', (select d from m),  'receiver', (select p1 from m)),
  jsonb_build_object('giver', (select p1 from m), 'receiver', (select d from m)),
  jsonb_build_object('giver', (select p2 from m), 'receiver', (select p3 from m)),
  jsonb_build_object('giver', (select p3 from m), 'receiver', (select p2 from m)))) $$,
  'P0001', 'invalid_input', 'con avoid_mutual rechaza pares mutuos');

select set_config('role', 'postgres', true);
update public.groups set avoid_mutual = false, single_cycle = true where id = (select id from g);
select set_config('role', 'service_role', true);
select throws_ok($$ select public.commit_draw((select id from g), jsonb_build_array(
  jsonb_build_object('giver', (select d from m),  'receiver', (select p1 from m)),
  jsonb_build_object('giver', (select p1 from m), 'receiver', (select d from m)),
  jsonb_build_object('giver', (select p2 from m), 'receiver', (select p3 from m)),
  jsonb_build_object('giver', (select p3 from m), 'receiver', (select p2 from m)))) $$,
  'P0001', 'invalid_input', 'con single_cycle rechaza dos ciclos');
select lives_ok($$ select public.commit_draw((select id from g), jsonb_build_array(
  jsonb_build_object('giver', (select d from m),  'receiver', (select p2 from m)),
  jsonb_build_object('giver', (select p2 from m), 'receiver', (select p1 from m)),
  jsonb_build_object('giver', (select p1 from m), 'receiver', (select p3 from m)),
  jsonb_build_object('giver', (select p3 from m), 'receiver', (select d from m)))) $$,
  'con single_cycle acepta un ciclo único');

select * from finish();
rollback;
