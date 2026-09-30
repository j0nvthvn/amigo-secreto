-- P4: quien no es dueño no puede agregar, renombrar, quitar ni ver links
begin;
\ir _helpers.psql
select plan(6);

create temp table ctx as select pg_temp.new_user() as owner, pg_temp.new_user() as other;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
grant select on ctx, g to authenticated;

-- other es miembro reclamado del grupo: tampoco es dueño
update public.members set user_id = (select other from ctx), claimed_at = now()
where id = pg_temp.member_id((select id from g), 'Persona 1');
create temp table m as select pg_temp.member_id((select id from g), 'Persona 2') as id;
grant select on m to authenticated;

select pg_temp.login((select other from ctx));
select throws_ok($$ select public.add_member((select id from g), 'Intruso') $$,
  'P0001', 'not_owner', 'add_member da not_owner');
select throws_ok($$ select public.rename_member((select id from m), 'Otro') $$,
  'P0001', 'not_owner', 'rename_member da not_owner');
select throws_ok($$ select public.remove_member((select id from m)) $$,
  'P0001', 'not_owner', 'remove_member da not_owner');
select throws_ok($$ select * from public.get_invite_links((select id from g)) $$,
  'P0001', 'not_owner', 'get_invite_links da not_owner');
select throws_ok($$ select public.regenerate_invite((select id from m)) $$,
  'P0001', 'not_owner', 'regenerate_invite da not_owner');
select throws_ok($$ select public.add_member(gen_random_uuid(), 'Nadie') $$,
  'P0001', 'not_owner', 'un grupo inexistente también da not_owner');

select * from finish();
rollback;
