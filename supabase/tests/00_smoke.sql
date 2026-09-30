begin;
\ir _helpers.psql
select plan(1);
select ok(true, 'pgTAP disponible');
select * from finish();
rollback;
