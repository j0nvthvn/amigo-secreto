# Decisiones

Decisiones tomadas durante la implementación en lo que el diseño no dice o dice algo que no funciona. Una línea de motivo cada una.

| # | Fecha | Decisión | Motivo |
| --- | --- | --- | --- |
| I1 | 2026-09-30 | pnpm workspaces en vez de npm workspaces | Lo pidió el autor del diseño. `nodeLinker: hoisted` en `pnpm-workspace.yaml` porque React Native y Metro esperan un `node_modules` plano |
| I2 | 2026-09-30 | TypeScript 6.0 en todo el repo, no 7 | `typescript-eslint` todavía no soporta TypeScript 7 |
| I3 | 2026-09-30 | `strict` sin `noUncheckedIndexedAccess` | Con esa opción `draw.ts` no compila y el motor se entrega sin cambios |
| I4 | 2026-09-30 | ESLint para apps y paquetes; `deno lint` y `deno check` para `supabase/functions` | Las Edge Functions usan especificadores `npm:` que solo resuelve Deno |
| I5 | 2026-09-30 | La CLI de Supabase es devDependency (`pnpm exec supabase`) | Misma versión en local y en CI, sin instalación aparte |
| I6 | 2026-09-30 | Helpers de pgTAP en `supabase/tests/_helpers.psql`, incluidos con `\ir` | `supabase test db` acepta `\ir`; la extensión `.psql` evita que se ejecute como prueba |
| I7 | 2026-09-30 | `wishlist_write` usa el auxiliar `security definer` `public.is_my_member(member_id)` en vez de una subconsulta a `public.members` | Las subconsultas de una política corren con los permisos de `authenticated`, que no puede leer `members`: toda escritura en la lista fallaba con 42501 |
| I8 | 2026-09-30 | Las RPC van en `0004_rpc_groups.sql`, `0005_rpc_members.sql` y `0006_rpc_draw.sql` | Varios archivos `0004_*` repetirían la versión, que es la clave de `schema_migrations` |
| I9 | 2026-09-30 | Los miembros se ordenan por `created_at, id` para el sorteo y al insertar asignaciones | Los miembros creados en la misma transacción comparten `created_at` |
| I10 | 2026-09-30 | `update_group` exige que una fecha *nueva* no sea anterior a hoy en la zona del grupo; conservar la fecha actual siempre se permite | R2 solo cubre la creación; sin la excepción no se podría editar el nombre entre la fecha del evento y el archivado |
| I11 | 2026-09-30 | `get_group` devuelve el grupo sin `owner_id` | La respuesta no expone ids de usuario (P7); `is_owner` ya dice lo necesario |
| I12 | 2026-09-30 | `regenerate_invite` libera `user_id` y `claimed_at`, pero conserva `result_viewed_at` | El estado "vio su resultado" es del miembro, no de la sesión |
| I13 | 2026-09-30 | El dueño no puede reclamar ningún link de su grupo, aunque no participe (`already_member`) | Es el motivo de D4; sin esto un dueño que no participa podría abrir un link ajeno con su cuenta |
| I14 | 2026-09-30 | `open_invite` permite reclamar en un grupo archivado | El grupo queda en solo lectura y la web ya contempla ese estado |
| I15 | 2026-09-30 | Un grupo o miembro inexistente responde `not_owner` en las RPC del dueño, y `not_found` en `get_group` y `get_activity` | No revelar si un id existe |
| I16 | 2026-09-30 | `get_activity` recorta `p_limit` al rango 1–100 en vez de fallar | Límite por defecto 50 y máximo 100, como dice la API |
| I17 | 2026-09-30 | `0002_security.sql` agrega `alter default privileges revoke execute on functions from public` global, sin `in schema` | El `EXECUTE` que PUBLIC recibe por defecto es global y un default por esquema no lo quita. Sin esto, `anon` y `authenticated` ejecutaban todas las funciones nuevas, incluida `commit_draw`. P8 lo verifica |
