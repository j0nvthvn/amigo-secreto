-- P19: ítem 11 de la lista; escribir en la lista de otro; leer siendo o no del grupo.
-- Confirma también el arreglo de wishlist_write (docs/DECISIONS.md, I7).
begin;
\ir _helpers.psql
select plan(7);

create temp table ctx as
  select pg_temp.new_user() as owner, pg_temp.new_user(true) as ana, pg_temp.new_user(true) as stranger;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
update public.members set user_id = (select ana from ctx), claimed_at = now()
where id = pg_temp.member_id((select id from g), 'Persona 1');
create temp table m as select
  pg_temp.member_id((select id from g), 'Persona 1') as ana_member,
  pg_temp.member_id((select id from g), 'Persona 2') as other_member;
grant select on ctx, g, m to authenticated;

select pg_temp.login((select ana from ctx));
select lives_ok($$
  insert into public.wishlist_items (member_id, text, url, position)
  select (select ana_member from m), 'Libro ' || i, 'https://example.com/' || i, i
  from generate_series(1, 10) i $$,
  'el miembro agrega 10 ítems a su lista');
select throws_ok($$ insert into public.wishlist_items (member_id, text) values ((select ana_member from m), 'Once') $$,
  'P0001', 'invalid_input', 'el ítem 11 se rechaza');
select throws_ok($$ insert into public.wishlist_items (member_id, text) values ((select other_member from m), 'Ajeno') $$,
  '42501', null, 'no puede escribir en la lista de otro');
select lives_ok($$ update public.wishlist_items set text = 'Libro editado' where position = 1 $$,
  'puede editar su lista');

select pg_temp.login((select owner from ctx));
select is((select count(*) from public.wishlist_items), 10::bigint, 'el dueño del grupo la lee');
select is((select count(*) from public.wishlist_items where text = 'Libro editado'), 1::bigint,
  'la edición quedó guardada');

select pg_temp.login((select stranger from ctx));
select is((select count(*) from public.wishlist_items), 0::bigint, 'quien no es del grupo no ve nada');

select * from finish();
rollback;
