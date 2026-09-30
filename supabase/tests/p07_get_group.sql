-- P7: get_group para quien no pertenece y para un miembro
begin;
\ir _helpers.psql
select plan(8);

create temp table ctx as
  select pg_temp.new_user() as owner, pg_temp.new_user(true) as member, pg_temp.new_user(true) as stranger;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
update public.members set user_id = (select member from ctx), claimed_at = now()
where id = pg_temp.member_id((select id from g), 'Persona 1');
grant select on ctx, g to authenticated;

select pg_temp.login((select stranger from ctx));
select throws_ok($$ select public.get_group((select id from g)) $$,
  'P0001', 'not_found', 'quien no pertenece recibe not_found');
select throws_ok($$ select public.get_group(gen_random_uuid()) $$,
  'P0001', 'not_found', 'un grupo inexistente también da not_found');
select throws_ok($$ select * from public.get_activity((select id from g)) $$,
  'P0001', 'not_found', 'get_activity también da not_found');

select pg_temp.login((select member from ctx));
create temp table r as select public.get_group((select id from g)) as j;
select pg_temp.logout();

select is((select j -> 'is_owner' from r), 'false'::jsonb, 'el miembro no es dueño');
select is((select (j ->> 'my_member_id')::uuid from r), pg_temp.member_id((select id from g), 'Persona 1'),
  'devuelve su miembro');
select is((select jsonb_array_length(j -> 'members') from r), 5, 'lista los 5 miembros');
select ok(
  not exists (
    select 1 from public.member_invites i join public.members m on m.id = i.member_id
    where m.group_id = (select id from g) and position(i.token in (select j::text from r)) > 0),
  'no contiene tokens');
select ok(
  position((select owner from ctx)::text in (select j::text from r)) = 0
  and position((select member from ctx)::text in (select j::text from r)) = 0
  and position('user_id' in (select j::text from r)) = 0,
  'no contiene user_id');

select * from finish();
rollback;
