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
| I18 | 2026-09-30 | `draw-group` responde 200 con `{ ok: false, code, message }` para los errores de negocio; 400 con cuerpo inválido, 401 sin sesión, 405 con otro método y 500 con `code: "internal"` si falla algo inesperado | El documento no fija los códigos HTTP; así el cliente lee todos los errores de negocio con `functions.invoke` sin tratar excepciones |
| I19 | 2026-09-30 | Un usuario anónimo que llama a `draw-group` recibe `not_owner` | No puede ser dueño (R1) y `not_owner` ya está en la lista de errores de la función |
| I20 | 2026-09-30 | `commit_draw` también exige entre 4 y 100 miembros y respeta `single_cycle` y `avoid_mutual` | Es la última validación antes de guardar; cuesta poco y evita guardar un sorteo que no cumple las opciones del grupo |
| I21 | 2026-09-30 | `deno lint` sin la regla `no-import-prefix` | Las Edge Functions importan con `npm:` en línea, como documenta Supabase, sin un import map por función |
| I22 | 2026-09-30 | `reveal_result` funciona en un grupo archivado | Ver el propio resultado es lectura; la API no lista `group_archived` para esta RPC |
| I23 | 2026-09-30 | La lista de deseos de la persona revelada se lee de `wishlist_items` (RLS) con su `receiver_member_id` | `reveal_result` devuelve solo id y nombre, como indica la API |
| I24 | 2026-09-30 | Nombre de la app: **Te Tocó**. Paquete Android `tech.jflores.tetoco`, esquema `tetoco` | Es la frase del momento central ("te tocó Camila"), corta y en español de Chile. Resuelve el primer pendiente del diseño |
| I25 | 2026-09-30 | `WEB_ORIGIN` = `https://tetoco.jflores.tech`; links `https://tetoco.jflores.tech/r/<token>` | Coincide con el nombre y el esquema. Resuelve el segundo pendiente del diseño |
| I26 | 2026-09-30 | Proyecto Supabase `te-toco` (`mlyuwgbhuiikqzxbevnq`, sa-east-1). Migraciones 0001–0006 aplicadas con el conector de Supabase y versiones del historial alineadas a `0001`–`0006` | Así `supabase db push` reconoce lo ya aplicado. En el plan gratuito se pausó `planillas-fryt-staging` para liberar el cupo |
| I27 | 2026-09-30 | Advertencias aceptadas del asesor de seguridad: tablas con RLS sin políticas (D9) y RPC `security definer` ejecutables por `authenticated` (es la API). Pendiente: mover `is_group_viewer`, `is_archived`, `member_group` e `is_my_member` a un esquema no expuesto, y crear `pg_net` en `extensions` (M6) | Las primeras son el diseño; las pendientes exponen poco (requieren UUID) y no bloquean M3 |
