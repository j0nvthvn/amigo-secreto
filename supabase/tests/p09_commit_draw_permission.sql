-- P9: el rol authenticated no puede ejecutar commit_draw (D7)
begin;
\ir _helpers.psql
select plan(3);

create temp table ctx as select pg_temp.new_user() as owner;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
create temp table pairs as select pg_temp.cycle_pairs((select id from g)) as j;
grant select on g, pairs to authenticated;

select pg_temp.login((select owner from ctx));
select throws_ok($$ select public.commit_draw((select id from g), (select j from pairs)) $$,
  '42501', null, 'el dueño con rol authenticated no puede ejecutar commit_draw');

select pg_temp.logout();
select is((select status::text from public.groups where id = (select id from g)), 'open', 'el grupo sigue abierto');
select ok(not has_function_privilege('anon', 'public.commit_draw(uuid, jsonb)', 'execute'),
  'anon tampoco puede ejecutarla');

select * from finish();
rollback;
