# Te Tocó

Te Tocó es una app Android y web para organizar un Amigo Secreto a distancia. Cada participante entra con un link personal, sin crear cuenta. El sorteo se calcula en el servidor y nadie, ni siquiera quien organiza, puede leerlo completo.

Proyecto de portafolio: Postgres con acceso solo por RPC, sesiones anónimas de Supabase, un algoritmo de sorteo con restricciones y notificaciones nativas y web.

## Estructura

```text
apps/mobile         Expo + Expo Router (Android)
apps/web            Vite + React (participantes sin la app)
packages/shared     Cliente de Supabase, tipos, textos, códigos de error y validaciones
supabase/           Migraciones, Edge Functions (Deno) y pruebas pgTAP
docs/DECISIONS.md   Decisiones de implementación
```

## Desarrollo

Requisitos: Node 24, pnpm 11, Deno 2 y Docker (o Podman con `DOCKER_HOST` apuntando a su socket).

```bash
pnpm install
pnpm exec supabase start
pnpm typecheck && pnpm lint && pnpm test   # tipos, lint y tests del motor
pnpm test:db                               # pruebas pgTAP
pnpm exec supabase functions serve &       # Edge Functions en local
pnpm test:integration                      # pruebas de integración
```

Con Podman en un sistema con SELinux (por ejemplo Fedora), el contenedor de Edge Functions no puede leer `supabase/functions` hasta etiquetarla una vez con `chcon -R -t container_file_t supabase/functions`.
