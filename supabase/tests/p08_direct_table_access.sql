-- P8: el rol authenticated no puede leer ninguna tabla directo, salvo wishlist_items
begin;
\ir _helpers.psql
select plan(14);

select pg_temp.login(pg_temp.new_user());

select throws_ok(format('select * from public.%I', t), '42501', null, 'select directo en ' || t || ' se niega')
from unnest(array[
  'groups', 'members', 'member_invites', 'exclusions', 'assignments', 'messages',
  'thread_state', 'reports', 'push_subscriptions', 'group_events', 'reminders_sent'
]) as t;

select lives_ok('select * from public.wishlist_items', 'wishlist_items sí se puede consultar');

select pg_temp.logout();
select is(
  (select array_agg(p.oid::regprocedure::text order by 1) from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname like '\_%'
     and has_function_privilege('authenticated', p.oid, 'execute')),
  null, 'authenticated no ejecuta ninguna función interna (_*)');
select is(
  (select array_agg(p.oid::regprocedure::text order by 1) from pg_proc p
   where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')),
  null, 'anon no ejecuta ninguna función de public');

select * from finish();
rollback;
