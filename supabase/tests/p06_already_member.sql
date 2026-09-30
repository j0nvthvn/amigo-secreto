-- P6: un usuario no puede reclamar dos miembros del mismo grupo (R11)
begin;
\ir _helpers.psql
select plan(4);

create temp table ctx as
  select pg_temp.new_user() as owner, pg_temp.new_user() as solo_owner, pg_temp.new_user(true) as anon;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;

-- Grupo de un dueño que no participa
insert into public.groups (owner_id, name, event_date)
values ((select solo_owner from ctx), 'Curso', current_date + 3);
insert into public.members (group_id, display_name)
select id, 'Alumno' from public.groups where owner_id = (select solo_owner from ctx);

create temp table t as select
  pg_temp.token_of((select id from g), 'Persona 1') as p1,
  pg_temp.token_of((select id from g), 'Persona 2') as p2,
  pg_temp.token_of((select id from g), 'Persona 3') as p3,
  (select i.token from public.member_invites i join public.members m on m.id = i.member_id
   join public.groups gr on gr.id = m.group_id where gr.owner_id = (select solo_owner from ctx)) as alumno;
grant select on ctx, g, t to authenticated;

select pg_temp.login((select anon from ctx));
select lives_ok($$ select public.open_invite((select p1 from t)) $$, 'reclama el primer link');
select throws_ok($$ select public.open_invite((select p2 from t)) $$,
  'P0001', 'already_member', 'el segundo link del mismo grupo da already_member');

select pg_temp.login((select owner from ctx));
select throws_ok($$ select public.open_invite((select p3 from t)) $$,
  'P0001', 'already_member', 'el dueño participante no puede reclamar links ajenos');

select pg_temp.login((select solo_owner from ctx));
select throws_ok($$ select public.open_invite((select alumno from t)) $$,
  'P0001', 'already_member', 'el dueño que no participa tampoco (docs/DECISIONS.md)');

select * from finish();
rollback;
