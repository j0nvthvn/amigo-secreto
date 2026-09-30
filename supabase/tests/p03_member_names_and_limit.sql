-- P3: nombre repetido con otra mayúscula o espacios; miembro número 101
begin;
\ir _helpers.psql
select plan(5);

create temp table ctx as select pg_temp.new_user() as owner;
create temp table g as select pg_temp.new_group((select owner from ctx), 0) as id;
grant select on ctx, g to authenticated;

select pg_temp.login((select owner from ctx));
select lives_ok($$ select public.add_member((select id from g), 'Camila') $$, 'agrega a Camila');
select throws_ok($$ select public.add_member((select id from g), '  cAMILA ') $$,
  'P0001', 'name_taken', 'mayúsculas y espacios distintos dan name_taken');
select throws_ok($$ select public.add_member((select id from g), '   ') $$,
  'P0001', 'invalid_input', 'nombre vacío da invalid_input');

-- Dueño + Camila + 98 = 100 miembros
select public.add_member((select id from g), 'Persona ' || i) from generate_series(1, 98) i;
select is((select jsonb_array_length(public.get_group((select id from g)) -> 'members')), 100, 'hay 100 miembros');
select throws_ok($$ select public.add_member((select id from g), 'Persona 101') $$,
  'P0001', 'member_limit', 'el miembro 101 da member_limit');

select * from finish();
rollback;
