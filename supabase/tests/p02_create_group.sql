-- P2: el dueño crea un grupo participando; además validaciones y límite de R1 y R2
begin;
\ir _helpers.psql
select plan(12);

create temp table ctx as select pg_temp.new_user() as owner;
grant select on ctx to authenticated;

select pg_temp.login((select owner from ctx));
create temp table g as
  select public.create_group('  Familia 2026 ', current_date + 30, 'America/Santiago', 'Casa', 20000,
                             'CLP', true, ' Jonathan ') as id;
select pg_temp.logout();

select is((select name from public.groups where id = (select id from g)), 'Familia 2026', 'guarda el nombre sin espacios');
select is((select count(*) from public.members where group_id = (select id from g)), 1::bigint, 'crea un miembro');
select is((select user_id from public.members where group_id = (select id from g)), (select owner from ctx),
          'el miembro queda reclamado por el dueño');
select is((select display_name from public.members where group_id = (select id from g)), 'Jonathan',
          'con el nombre elegido');
select isnt((select claimed_at from public.members where group_id = (select id from g)), null, 'con claimed_at');
select results_eq(
  $$ select kind::text, member_name from public.group_events where group_id = (select id from g) $$,
  $$ values ('member_added', 'Jonathan') $$,
  'registra el evento member_added');
select is((select count(*) from public.member_invites i join public.members m on m.id = i.member_id
           where m.group_id = (select id from g) and char_length(i.token) = 22), 1::bigint,
          'el miembro tiene un token de 22 caracteres');

-- Sin participar: no hay miembro
select pg_temp.login((select owner from ctx));
create temp table g2 as
  select public.create_group('Curso 4B', current_date + 5, null, null, null, null, false, null) as id;
select pg_temp.logout();
select is((select count(*) from public.members where group_id = (select id from g2)), 0::bigint,
          'si no participa no se crea su miembro');
select is((select timezone || ' ' || currency from public.groups where id = (select id from g2)),
          'America/Santiago CLP', 'zona y moneda por defecto');

-- Validaciones
select pg_temp.login((select owner from ctx));
select throws_ok($$ select public.create_group('Pasado', current_date - 2) $$,
  'P0001', 'invalid_input', 'fecha anterior a hoy');
select throws_ok($$ select public.create_group(repeat('x', 61), current_date + 1) $$,
  'P0001', 'invalid_input', 'nombre de 61 caracteres');

-- R1: máximo 20 grupos por dueño (ya tiene 2)
select public.create_group('Grupo ' || i, current_date + 1, p_owner_participates => false)
from generate_series(3, 20) i;
select throws_ok($$ select public.create_group('Grupo 21', current_date + 1, p_owner_participates => false) $$,
  'P0001', 'group_limit', 'el grupo 21 da group_limit');

select * from finish();
rollback;
