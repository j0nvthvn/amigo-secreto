-- 0002_security.sql
-- Supabase da permisos por defecto a anon y authenticated: se quitan explícitamente.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
-- Desviación del diseño (docs/DECISIONS.md, I17): el EXECUTE que PUBLIC recibe por defecto en toda
-- función nueva es un default global, y un default por esquema no puede quitarlo. Sin esta línea,
-- anon y authenticated podrían ejecutar cualquier RPC nueva, incluida commit_draw.
alter default privileges revoke execute on functions from public;

-- RLS activado en todas las tablas; sin políticas = sin acceso
alter table public.groups             enable row level security;
alter table public.members            enable row level security;
alter table public.member_invites     enable row level security;
alter table public.exclusions         enable row level security;
alter table public.assignments        enable row level security;
alter table public.wishlist_items     enable row level security;
alter table public.messages           enable row level security;
alter table public.thread_state       enable row level security;
alter table public.reports            enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.group_events       enable row level security;
alter table public.reminders_sent     enable row level security;

-- Auxiliares
create function public.is_group_viewer(p_group_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups g where g.id = p_group_id and g.owner_id = auth.uid())
      or exists (select 1 from public.members m where m.group_id = p_group_id and m.user_id = auth.uid());
$$;

create function public.is_archived(p_group_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (now() at time zone g.timezone)::date >= g.event_date + 7
  from public.groups g where g.id = p_group_id;
$$;

create function public.member_group(p_member_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select group_id from public.members where id = p_member_id;
$$;

-- Desviación del diseño (docs/DECISIONS.md, I7): la política de escritura de listas no puede
-- consultar public.members directamente porque authenticated no tiene select sobre ella.
create function public.is_my_member(p_member_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.id = p_member_id and m.user_id = auth.uid());
$$;

grant execute on function public.is_group_viewer(uuid), public.is_archived(uuid),
  public.member_group(uuid), public.is_my_member(uuid) to authenticated;

-- Listas de deseos: la lee el grupo, la escribe su miembro
grant select, insert, update, delete on public.wishlist_items to authenticated;

create policy wishlist_read on public.wishlist_items for select to authenticated
  using (public.is_group_viewer(public.member_group(member_id)));

create policy wishlist_write on public.wishlist_items for all to authenticated
  using (public.is_my_member(member_id)
         and not public.is_archived(public.member_group(member_id)))
  with check (public.is_my_member(member_id)
         and not public.is_archived(public.member_group(member_id)));

-- Tiempo real: cada usuario solo escucha su propio canal
create policy realtime_own_channel on realtime.messages for select to authenticated
  using (realtime.topic() = 'user:' || auth.uid()::text);
