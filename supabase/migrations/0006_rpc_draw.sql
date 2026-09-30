-- 0006_rpc_draw.sql
-- RPC del sorteo. El sorteo se calcula en la Edge Function draw-group y se guarda con
-- commit_draw, que solo puede ejecutar service_role (D7).

create function public.set_draw_options(p_group_id uuid, p_avoid_mutual boolean, p_single_cycle boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_group public.groups := public._lock_owned_group(p_group_id, v_uid);
begin
  if public.is_archived(p_group_id) then
    perform public._raise('group_archived');
  end if;
  if v_group.status <> 'open' then
    perform public._raise('group_not_open');
  end if;
  if p_avoid_mutual is null or p_single_cycle is null then
    perform public._raise('invalid_input');
  end if;

  update public.groups
     set avoid_mutual = p_avoid_mutual, single_cycle = p_single_cycle
   where id = p_group_id;
end;
$$;

-- Convierte [{"giver": uuid, "receiver": uuid}] en pares validados del grupo.
-- Cualquier problema de formato o un miembro de otro grupo da invalid_input.
create function public._parse_pairs(p_group_id uuid, p_pairs jsonb)
returns table (giver uuid, receiver uuid)
language plpgsql stable set search_path = '' as $$
declare
  v_item jsonb;
  v_giver uuid;
  v_receiver uuid;
begin
  if p_pairs is null or jsonb_typeof(p_pairs) <> 'array' then
    perform public._raise('invalid_input');
  end if;

  for v_item in select value from jsonb_array_elements(p_pairs) loop
    if jsonb_typeof(v_item) <> 'object' then
      perform public._raise('invalid_input');
    end if;
    begin
      v_giver := (v_item ->> 'giver')::uuid;
      v_receiver := (v_item ->> 'receiver')::uuid;
    exception when invalid_text_representation then
      perform public._raise('invalid_input');
    end;
    if v_giver is null or v_receiver is null or v_giver = v_receiver
       or not exists (select 1 from public.members where id = v_giver and group_id = p_group_id)
       or not exists (select 1 from public.members where id = v_receiver and group_id = p_group_id) then
      perform public._raise('invalid_input');
    end if;
    giver := v_giver;
    receiver := v_receiver;
    return next;
  end loop;
end;
$$;

create function public.set_exclusions(p_group_id uuid, p_pairs jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_group public.groups := public._lock_owned_group(p_group_id, v_uid);
begin
  if public.is_archived(p_group_id) then
    perform public._raise('group_archived');
  end if;
  if v_group.status <> 'open' then
    perform public._raise('group_not_open');
  end if;

  create temp table _new_exclusions on commit drop as
    select distinct giver, receiver from public._parse_pairs(p_group_id, p_pairs);

  delete from public.exclusions where group_id = p_group_id;
  insert into public.exclusions (group_id, giver_member_id, receiver_member_id)
  select p_group_id, giver, receiver from _new_exclusions;
  drop table _new_exclusions;
end;
$$;

create function public.get_exclusions(p_group_id uuid)
returns table (giver_member_id uuid, receiver_member_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = v_uid) then
    perform public._raise('not_owner');
  end if;

  return query
  select e.giver_member_id, e.receiver_member_id
  from public.exclusions e
  where e.group_id = p_group_id;
end;
$$;

-- Solo service_role. Vuelve a bloquear y validar todo: dos llamadas simultáneas
-- de draw-group no pueden generar dos sorteos, y un sorteo inválido nunca se guarda.
create function public.commit_draw(p_group_id uuid, p_pairs jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_group public.groups;
  v_members integer;
  v_pairs integer;
  v_cycle_length integer;
begin
  select * into v_group from public.groups where id = p_group_id for update;
  if not found then
    perform public._raise('invalid_input');
  end if;
  if v_group.status <> 'open' then
    perform public._raise('group_not_open');
  end if;

  create temp table _draw on commit drop as
    select giver, receiver from public._parse_pairs(p_group_id, p_pairs);

  select count(*) into v_members from public.members where group_id = p_group_id;
  select count(*) into v_pairs from _draw;

  -- Permutación de los miembros actuales: cada uno regala y recibe exactamente una vez
  if v_members not between 4 and 100
     or v_pairs <> v_members
     or (select count(distinct giver) from _draw) <> v_members
     or (select count(distinct receiver) from _draw) <> v_members then
    perform public._raise('invalid_input');
  end if;

  -- Respeta las exclusiones
  if exists (select 1 from _draw d join public.exclusions e
             on e.giver_member_id = d.giver and e.receiver_member_id = d.receiver) then
    perform public._raise('invalid_input');
  end if;

  -- Respeta las opciones del grupo
  if v_group.single_cycle then
    with recursive walk (member_id, steps) as (
      select giver, 1 from _draw where giver = (select min(giver::text)::uuid from _draw)
      union all
      select d.receiver, w.steps + 1
      from walk w join _draw d on d.giver = w.member_id
      where w.steps < v_members
    )
    select count(distinct member_id) into v_cycle_length from walk;
    if v_cycle_length <> v_members then
      perform public._raise('invalid_input');
    end if;
  elsif v_group.avoid_mutual then
    if exists (select 1 from _draw a join _draw b on a.giver = b.receiver and a.receiver = b.giver) then
      perform public._raise('invalid_input');
    end if;
  end if;

  -- En el orden de los miembros, no en el del ciclo
  insert into public.assignments (group_id, giver_member_id, receiver_member_id)
  select p_group_id, d.giver, d.receiver
  from _draw d join public.members m on m.id = d.giver
  order by m.created_at, m.id;
  drop table _draw;

  update public.groups set status = 'drawn', drawn_at = now() where id = p_group_id;
  perform public._log_event(p_group_id, 'draw_done');
end;
$$;

create function public.reset_draw(p_group_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_group public.groups := public._lock_owned_group(p_group_id, v_uid);
begin
  if v_group.status <> 'drawn' then
    perform public._raise('group_not_drawn');
  end if;
  if public.is_archived(p_group_id) then
    perform public._raise('group_archived');
  end if;

  -- R20: los mensajes se borran en cascada con las asignaciones
  delete from public.assignments where group_id = p_group_id;
  delete from public.thread_state ts
   using public.members m
   where m.id = ts.member_id and m.group_id = p_group_id;
  update public.members set result_viewed_at = null where group_id = p_group_id;
  delete from public.reminders_sent where group_id = p_group_id and kind = 'reveal_pending';
  update public.groups set status = 'open', drawn_at = null where id = p_group_id;
  perform public._log_event(p_group_id, 'draw_reset');
end;
$$;

create function public.reveal_result(p_group_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_member public.members;
  v_status public.group_status;
  v_receiver public.members;
begin
  select * into v_member from public.members
  where group_id = p_group_id and user_id = v_uid
  for update;
  if not found then
    perform public._raise('not_member');
  end if;
  select status into v_status from public.groups where id = p_group_id;
  if v_status <> 'drawn' then
    perform public._raise('group_not_drawn');
  end if;

  select m.* into v_receiver
  from public.assignments a
  join public.members m on m.id = a.receiver_member_id
  where a.giver_member_id = v_member.id;

  if v_member.result_viewed_at is null then
    update public.members set result_viewed_at = now() where id = v_member.id;
    perform public._log_event(p_group_id, 'result_viewed', v_member.id, v_member.display_name);
  end if;

  return jsonb_build_object(
    'receiver_member_id', v_receiver.id,
    'receiver_display_name', v_receiver.display_name);
end;
$$;

grant execute on function
  public.set_draw_options(uuid, boolean, boolean),
  public.set_exclusions(uuid, jsonb),
  public.get_exclusions(uuid),
  public.reset_draw(uuid),
  public.reveal_result(uuid)
to authenticated;

-- D7: si commit_draw quedara expuesta, un dueño podría escribir el sorteo que quisiera
revoke execute on function public.commit_draw(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.commit_draw(uuid, jsonb) to service_role;
