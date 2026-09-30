-- P10: commit_draw rechaza pares que violan exclusiones, que no son permutación, o con el grupo en drawn
begin;
\ir _helpers.psql
select plan(8);

create temp table ctx as select pg_temp.new_user() as owner;
create temp table g as select pg_temp.new_group((select owner from ctx), 4) as id;
create temp table pairs as select pg_temp.cycle_pairs((select id from g)) as j;
grant select on g, pairs to service_role;

-- Una exclusión que choca con el primer par del ciclo
select set_config('role', 'postgres', true);
insert into public.exclusions (group_id, giver_member_id, receiver_member_id)
select (select id from g), (j -> 0 ->> 'giver')::uuid, (j -> 0 ->> 'receiver')::uuid from pairs;
select set_config('role', 'service_role', true);
select throws_ok($$ select public.commit_draw((select id from g), (select j from pairs)) $$,
  'P0001', 'invalid_input', 'un par que viola una exclusión da invalid_input');
select set_config('role', 'postgres', true);
delete from public.exclusions;
select set_config('role', 'service_role', true);

select throws_ok($$ select public.commit_draw((select id from g), (select j - 0 from pairs)) $$,
  'P0001', 'invalid_input', 'falta un par: no es permutación');
select throws_ok(
  $$ select public.commit_draw((select id from g),
       (select jsonb_agg(jsonb_build_object('giver', e -> 'giver', 'receiver', j -> 0 -> 'receiver'))
        from pairs, jsonb_array_elements(j) e)) $$,
  'P0001', 'invalid_input', 'todos le regalan a la misma persona: no es permutación');
select throws_ok(
  $$ select public.commit_draw((select id from g),
       (select jsonb_agg(jsonb_build_object('giver', e -> 'giver', 'receiver', e -> 'giver'))
        from pairs, jsonb_array_elements(j) e)) $$,
  'P0001', 'invalid_input', 'cada uno se regala a sí mismo');
select throws_ok($$ select public.commit_draw((select id from g), '[{"giver": "x", "receiver": "y"}]') $$,
  'P0001', 'invalid_input', 'ids que no son uuid');

select lives_ok($$ select public.commit_draw((select id from g), (select j from pairs)) $$,
  'un sorteo válido se guarda');
select throws_ok($$ select public.commit_draw((select id from g), (select j from pairs)) $$,
  'P0001', 'group_not_open', 'con el grupo en drawn da group_not_open');

select set_config('role', 'postgres', true);
select results_eq(
  $$ select g.status::text, g.drawn_at is not null, (select count(*) from public.assignments a where a.group_id = g.id),
            (select count(*) from public.group_events e where e.group_id = g.id and e.kind = 'draw_done')
     from public.groups g where g.id = (select id from g) $$,
  $$ values ('drawn', true, 5::bigint, 1::bigint) $$,
  'queda en drawn, con drawn_at, 5 asignaciones y el evento draw_done');

select * from finish();
rollback;
