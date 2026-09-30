-- 0004_rpc_groups.sql
-- Auxiliares internos (sin grant a clientes) y RPC de grupos.
-- Toda RPC valida en orden: sesión, rol, estado del grupo y datos.

-- ---------------------------------------------------------------------------
-- Auxiliares internos
-- ---------------------------------------------------------------------------

create function public._raise(p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_code;
end;
$$;

-- Usuario actual o not_authenticated
create function public._uid() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform public._raise('not_authenticated');
  end if;
  return v_uid;
end;
$$;

create function public._is_anonymous() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- Bloquea el grupo y exige que el usuario sea su dueño. Un grupo inexistente
-- también responde not_owner, para no revelar si existe.
create function public._lock_owned_group(p_group_id uuid, p_uid uuid) returns public.groups
language plpgsql set search_path = '' as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups where id = p_group_id for update;
  if not found or v_group.owner_id <> p_uid then
    perform public._raise('not_owner');
  end if;
  return v_group;
end;
$$;

create function public._today_in(p_timezone text) returns date
language sql stable set search_path = '' as $$
  select (now() at time zone p_timezone)::date;
$$;

create function public._log_event(
  p_group_id uuid,
  p_kind public.group_event_kind,
  p_member_id uuid default null,
  p_member_name text default null,
  p_target_user_id uuid default null
) returns void
language sql set search_path = '' as $$
  insert into public.group_events (group_id, kind, member_id, member_name, target_user_id)
  values (p_group_id, p_kind, p_member_id, p_member_name, p_target_user_id);
$$;

-- Mensajes del otro lado posteriores a la última lectura del miembro
create function public._unread(p_member_id uuid, p_side public.thread_side) returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer
  from public.assignments a
  join public.messages msg on msg.assignment_id = a.id
  left join public.thread_state ts on ts.member_id = p_member_id and ts.side = p_side
  where case p_side
          when 'giving'    then a.giver_member_id = p_member_id    and msg.direction = 'to_giver'
          when 'receiving' then a.receiver_member_id = p_member_id and msg.direction = 'to_receiver'
        end
    and msg.created_at > coalesce(ts.last_read_at, 'epoch');
$$;

create function public._muted(p_member_id uuid, p_side public.thread_side) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(
    (select muted from public.thread_state where member_id = p_member_id and side = p_side),
    false);
$$;

-- Validaciones de datos del grupo (R2)
create function public._valid_group_fields(
  p_name text, p_place text, p_budget_amount integer, p_currency text
) returns boolean
language sql immutable set search_path = '' as $$
  select p_name is not null
     and char_length(btrim(p_name)) between 1 and 60
     and (p_place is null or char_length(btrim(p_place)) <= 120)
     and (p_budget_amount is null or p_budget_amount >= 0)
     and p_currency is not null
     and p_currency ~ '^[A-Z]{3}$';
$$;

-- ---------------------------------------------------------------------------
-- RPC de grupos
-- ---------------------------------------------------------------------------

create function public.create_group(
  p_name text,
  p_event_date date,
  p_timezone text default 'America/Santiago',
  p_place text default null,
  p_budget_amount integer default null,
  p_currency text default 'CLP',
  p_owner_participates boolean default true,
  p_owner_display_name text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_timezone text := coalesce(p_timezone, 'America/Santiago');
  v_currency text := coalesce(p_currency, 'CLP');
  v_participates boolean := coalesce(p_owner_participates, true);
  v_group_id uuid;
  v_member_id uuid;
begin
  if public._is_anonymous() then
    perform public._raise('anonymous_not_allowed');
  end if;

  -- Serializa las creaciones del mismo dueño para que el límite no se salte
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('create_group:' || v_uid::text));
  if (select count(*) from public.groups where owner_id = v_uid) >= 20 then
    perform public._raise('group_limit');
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_timezone)
     or p_event_date is null
     or p_event_date < public._today_in(v_timezone)
     or not public._valid_group_fields(p_name, p_place, p_budget_amount, v_currency)
     or (v_participates and (p_owner_display_name is null
                             or char_length(btrim(p_owner_display_name)) not between 1 and 40)) then
    perform public._raise('invalid_input');
  end if;

  insert into public.groups (owner_id, name, event_date, timezone, place, budget_amount, currency)
  values (v_uid, btrim(p_name), p_event_date, v_timezone, nullif(btrim(p_place), ''),
          p_budget_amount, v_currency)
  returning id into v_group_id;

  if v_participates then
    insert into public.members (group_id, display_name, user_id, claimed_at)
    values (v_group_id, btrim(p_owner_display_name), v_uid, now())
    returning id into v_member_id;
    perform public._log_event(v_group_id, 'member_added', v_member_id, btrim(p_owner_display_name));
  end if;

  return v_group_id;
end;
$$;

create function public.update_group(
  p_group_id uuid,
  p_name text,
  p_event_date date,
  p_place text default null,
  p_budget_amount integer default null,
  p_currency text default 'CLP'
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_group public.groups := public._lock_owned_group(p_group_id, v_uid);
  v_currency text := coalesce(p_currency, 'CLP');
begin
  if public.is_archived(p_group_id) then
    perform public._raise('group_archived');
  end if;

  -- Una fecha nueva no puede ser anterior a hoy (docs/DECISIONS.md, I10)
  if p_event_date is null
     or (p_event_date <> v_group.event_date and p_event_date < public._today_in(v_group.timezone))
     or not public._valid_group_fields(p_name, p_place, p_budget_amount, v_currency) then
    perform public._raise('invalid_input');
  end if;

  update public.groups
     set name = btrim(p_name),
         event_date = p_event_date,
         place = nullif(btrim(p_place), ''),
         budget_amount = p_budget_amount,
         currency = v_currency
   where id = p_group_id;
end;
$$;

create function public.delete_group(p_group_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
begin
  perform public._lock_owned_group(p_group_id, v_uid);
  delete from public.groups where id = p_group_id;
end;
$$;

create function public.get_my_groups()
returns table (
  group_id uuid,
  name text,
  event_date date,
  status public.group_status,
  is_owner boolean,
  archived boolean,
  unread integer
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
begin
  return query
  select g.id,
         g.name,
         g.event_date,
         g.status,
         g.owner_id = v_uid,
         public.is_archived(g.id),
         coalesce(public._unread(m.id, 'giving') + public._unread(m.id, 'receiving'), 0)
  from public.groups g
  left join public.members m on m.group_id = g.id and m.user_id = v_uid
  where g.owner_id = v_uid or m.id is not null
  order by g.event_date, g.created_at;
end;
$$;

create function public.get_group(p_group_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_group public.groups;
  v_member_id uuid;
begin
  select * into v_group from public.groups where id = p_group_id;
  select id into v_member_id from public.members where group_id = p_group_id and user_id = v_uid;
  if v_group.id is null or (v_group.owner_id <> v_uid and v_member_id is null) then
    perform public._raise('not_found');
  end if;

  return jsonb_build_object(
    -- Sin owner_id: la respuesta no expone ids de usuario (docs/DECISIONS.md, I11)
    'group', (to_jsonb(v_group) - 'owner_id')
             || jsonb_build_object('archived', public.is_archived(p_group_id)),
    'is_owner', v_group.owner_id = v_uid,
    'my_member_id', v_member_id,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id,
               'display_name', m.display_name,
               'claimed', m.user_id is not null,
               'result_viewed', m.result_viewed_at is not null
             ) order by m.created_at, m.id)
      from public.members m
      where m.group_id = p_group_id), '[]'::jsonb),
    'unread', case when v_member_id is null then null else jsonb_build_object(
      'giving', public._unread(v_member_id, 'giving'),
      'receiving', public._unread(v_member_id, 'receiving')) end,
    'muted', case when v_member_id is null then null else jsonb_build_object(
      'giving', public._muted(v_member_id, 'giving'),
      'receiving', public._muted(v_member_id, 'receiving')) end
  );
end;
$$;

create function public.get_activity(
  p_group_id uuid,
  p_before_id bigint default null,
  p_limit integer default 50
)
returns table (
  id bigint,
  kind public.group_event_kind,
  member_name text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
begin
  if not public.is_group_viewer(p_group_id) then
    perform public._raise('not_found');
  end if;

  return query
  select e.id, e.kind, e.member_name, e.created_at
  from public.group_events e
  where e.group_id = p_group_id
    and (p_before_id is null or e.id < p_before_id)
  order by e.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

grant execute on function
  public.create_group(text, date, text, text, integer, text, boolean, text),
  public.update_group(uuid, text, date, text, integer, text),
  public.delete_group(uuid),
  public.get_my_groups(),
  public.get_group(uuid),
  public.get_activity(uuid, bigint, integer)
to authenticated;
