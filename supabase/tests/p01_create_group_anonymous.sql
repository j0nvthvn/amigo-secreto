-- P1: un usuario anónimo no puede crear grupos
begin;
\ir _helpers.psql
select plan(3);

create temp table ctx as select pg_temp.new_user(p_anonymous => true) as anon;
select pg_temp.login((select anon from ctx));

select throws_ok(
  $$ select public.create_group('Familia', current_date + 10) $$,
  'P0001', 'anonymous_not_allowed', 'anónimo recibe anonymous_not_allowed');

select pg_temp.logout();
select is((select count(*) from public.groups where owner_id = (select anon from ctx)), 0::bigint,
  'no se creó ningún grupo');

-- Sin sesión
select set_config('role', 'authenticated', true);
select throws_ok(
  $$ select public.create_group('Familia', current_date + 10) $$,
  'P0001', 'not_authenticated', 'sin sesión recibe not_authenticated');

select * from finish();
rollback;
