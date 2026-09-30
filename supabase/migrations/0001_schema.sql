-- 0001_schema.sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

create type public.group_status     as enum ('open', 'drawn');
create type public.thread_side      as enum ('giving', 'receiving');
create type public.msg_direction    as enum ('to_receiver', 'to_giver');
create type public.push_kind        as enum ('expo', 'web');
create type public.report_status    as enum ('pending', 'dismissed', 'actioned');
create type public.group_event_kind as enum (
  'member_added', 'member_renamed', 'member_removed',
  'invite_claimed', 'invite_regenerated',
  'draw_done', 'draw_reset', 'result_viewed'
);

create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 60),
  event_date    date not null,
  timezone      text not null default 'America/Santiago',
  place         text check (char_length(place) <= 120),
  budget_amount integer check (budget_amount >= 0),
  currency      text not null default 'CLP' check (currency ~ '^[A-Z]{3}$'),
  status        public.group_status not null default 'open',
  avoid_mutual  boolean not null default true,
  single_cycle  boolean not null default false,
  drawn_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index on public.groups (owner_id);
create index on public.groups (event_date);

create table public.members (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.groups on delete cascade,
  display_name     text not null check (char_length(btrim(display_name)) between 1 and 40),
  user_id          uuid references auth.users on delete set null,
  claimed_at       timestamptz,
  result_viewed_at timestamptz,
  created_at       timestamptz not null default now(),
  unique (group_id, user_id),
  unique (group_id, id)
);
create unique index members_name_unique on public.members (group_id, lower(btrim(display_name)));
create index on public.members (user_id);

-- Tokens en tabla aparte: ningún cliente la lee; solo el dueño, vía get_invite_links
create table public.member_invites (
  member_id  uuid primary key references public.members on delete cascade,
  token      text not null unique check (char_length(token) = 22),
  created_at timestamptz not null default now()
);

create table public.exclusions (
  group_id           uuid not null,
  giver_member_id    uuid not null,
  receiver_member_id uuid not null,
  primary key (giver_member_id, receiver_member_id),
  foreign key (group_id, giver_member_id)    references public.members (group_id, id) on delete cascade,
  foreign key (group_id, receiver_member_id) references public.members (group_id, id) on delete cascade,
  check (giver_member_id <> receiver_member_id)
);

create table public.assignments (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null,
  giver_member_id    uuid not null unique,
  receiver_member_id uuid not null unique,
  foreign key (group_id, giver_member_id)    references public.members (group_id, id) on delete cascade,
  foreign key (group_id, receiver_member_id) references public.members (group_id, id) on delete cascade,
  check (giver_member_id <> receiver_member_id)
);
create index on public.assignments (group_id);

create table public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members on delete cascade,
  text       text not null check (char_length(btrim(text)) between 1 and 200),
  url        text check (url ~* '^https?://' and char_length(url) <= 500),
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);
create index on public.wishlist_items (member_id);

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments on delete cascade,
  direction     public.msg_direction not null,
  body          text not null check (char_length(btrim(body)) between 1 and 500),
  created_at    timestamptz not null default now()
);
create index on public.messages (assignment_id, created_at desc);

-- Estado por miembro y lado; nunca expone assignment_id a quien recibe
create table public.thread_state (
  member_id    uuid not null references public.members on delete cascade,
  side         public.thread_side not null,
  last_read_at timestamptz not null default 'epoch',
  muted        boolean not null default false,
  primary key (member_id, side)
);

create table public.reports (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null references public.groups on delete cascade,
  message_id         uuid references public.messages on delete set null,
  message_body       text not null,  -- copia: el mensaje puede borrarse al repetir el sorteo
  reporter_member_id uuid not null references public.members on delete cascade,
  reason             text check (char_length(reason) <= 300),
  status             public.report_status not null default 'pending',
  created_at         timestamptz not null default now()
);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  kind       public.push_kind not null,
  token      text not null unique,  -- token de Expo o endpoint de Web Push
  p256dh     text,
  auth_key   text,
  created_at timestamptz not null default now(),
  check (kind = 'expo' or (p256dh is not null and auth_key is not null))
);
create index on public.push_subscriptions (user_id);

create table public.group_events (
  id          bigint generated always as identity primary key,
  group_id    uuid not null references public.groups on delete cascade,
  kind        public.group_event_kind not null,
  member_id   uuid references public.members on delete set null,
  member_name text,  -- nombre al momento del evento
  target_user_id uuid,  -- solo para avisos (quien tenía el link regenerado); nunca se expone
  created_at  timestamptz not null default now()
);
create index on public.group_events (group_id, created_at desc);

-- Evita enviar dos veces el mismo recordatorio
create table public.reminders_sent (
  group_id uuid not null references public.groups on delete cascade,
  kind     text not null check (kind in ('event_7d', 'event_1d', 'reveal_pending')),
  sent_at  timestamptz not null default now(),
  primary key (group_id, kind)
);
