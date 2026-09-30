-- P14: regenerate_invite invalida el token anterior, libera el reclamo y queda en la actividad
begin;
\ir _helpers.psql
select plan(8);

create temp table ctx as
  select pg_temp.new_user() as owner, pg_temp.new_user(true) as ana, pg_temp.new_user(true) as other;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
create temp table t as select pg_temp.member_id((select id from g), 'Persona 1') as member_id,
                              pg_temp.token_of((select id from g), 'Persona 1') as old_token;
update public.members set user_id = (select ana from ctx), claimed_at = now(), result_viewed_at = now()
where id = (select member_id from t);
create temp table new_token (token text);
grant select on ctx, g, t to authenticated;
grant select, insert on new_token to authenticated;

select pg_temp.login((select owner from ctx));
insert into new_token select public.regenerate_invite((select member_id from t));

select isnt((select token from new_token), (select old_token from t), 'devuelve un token nuevo');
select is(char_length((select token from new_token)), 22, 'de 22 caracteres');

select pg_temp.login((select other from ctx));
select throws_ok($$ select public.open_invite((select old_token from t)) $$,
  'P0001', 'invalid_token', 'el token anterior da invalid_token');

select pg_temp.logout();
select results_eq(
  $$ select user_id, claimed_at, result_viewed_at is not null from public.members where id = (select member_id from t) $$,
  $$ values (null::uuid, null::timestamptz, true) $$,
  'el reclamo queda libre y se conserva result_viewed_at');
select results_eq(
  $$ select member_id, member_name, target_user_id from public.group_events
     where group_id = (select id from g) and kind = 'invite_regenerated' $$,
  $$ select (select member_id from t), 'Persona 1'::text, (select ana from ctx) $$,
  'existe el evento, con el usuario anterior para avisarle');

select pg_temp.login((select other from ctx));
select is(public.open_invite((select token from new_token)) ->> 'status', 'claimed',
  'el token nuevo se puede reclamar');

select pg_temp.login((select owner from ctx));
select is((select count(*) from public.get_activity((select id from g)) where kind = 'invite_regenerated'), 1::bigint,
  'todo el grupo ve el evento en la actividad');
select is(
  (select count(*) from public.get_activity((select id from g)) a
   where to_jsonb(a) ? 'target_user_id'), 0::bigint,
  'la actividad no expone target_user_id');

select * from finish();
rollback;
