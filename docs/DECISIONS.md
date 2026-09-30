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
