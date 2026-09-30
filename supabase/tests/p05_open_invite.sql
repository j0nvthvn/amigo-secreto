-- P5: open_invite la primera vez, desde la misma sesión y desde otra
begin;
\ir _helpers.psql
select plan(7);

create temp table ctx as
  select pg_temp.new_user() as owner, pg_temp.new_user(true) as anon1, pg_temp.new_user(true) as anon2;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
create temp table t as select pg_temp.token_of((select id from g), 'Persona 1') as token,
                              pg_temp.member_id((select id from g), 'Persona 1') as member_id;
grant select on ctx, g, t to authenticated;

select pg_temp.login((select anon1 from ctx));
select is(public.open_invite((select token from t)),
  jsonb_build_object('group_id', (select id from g), 'member_id', (select member_id from t), 'status', 'claimed'),
  'la primera vez reclama el miembro');
select is(public.open_invite((select token from t)) ->> 'status', 'already_yours',
  'la misma sesión recibe already_yours');

select pg_temp.login((select anon2 from ctx));
select throws_ok($$ select public.open_invite((select token from t)) $$,
  'P0001', 'claimed_by_other', 'otra sesión recibe claimed_by_other');
select throws_ok($$ select public.open_invite('AAAAAAAAAAAAAAAAAAAAAA') $$,
  'P0001', 'invalid_token', 'un token inexistente da invalid_token');

select pg_temp.logout();
select is((select user_id from public.members where id = (select member_id from t)), (select anon1 from ctx),
  'el miembro queda asociado al primer usuario');
select isnt((select claimed_at from public.members where id = (select member_id from t)), null, 'con claimed_at');
select results_eq(
  $$ select kind::text, member_name from public.group_events
     where group_id = (select id from g) and kind = 'invite_claimed' $$,
  $$ values ('invite_claimed', 'Persona 1') $$,
  'registra un solo evento invite_claimed');

select * from finish();
rollback;
