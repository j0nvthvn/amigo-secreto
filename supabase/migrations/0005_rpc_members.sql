-- 0005_rpc_members.sql
-- RPC de miembros y links personales.

-- Bloquea el grupo del miembro y exige que el usuario sea su dueño.
-- Un miembro inexistente responde not_owner, igual que un grupo ajeno.
create function public._lock_owned_member(p_member_id uuid, p_uid uuid) returns public.members
language plpgsql set search_path = '' as $$
declare
  v_member public.members;
begin
  select * into v_member from public.members where id = p_member_id;
  if not found then
    perform public._raise('not_owner');
  end if;
  perform public._lock_owned_group(v_member.group_id, p_uid);
  -- Relee el miembro con el grupo ya bloqueado
  select * into v_member from public.members where id = p_member_id for update;
  if not found then
    perform public._raise('not_owner');
  end if;
  return v_member;
end;
$$;

create function public._valid_member_name(p_display_name text) returns boolean
language sql immutable set search_path = '' as $$
  select p_display_name is not null and char_length(btrim(p_display_name)) between 1 and 40;
$$;

create function public._member_name_taken(p_group_id uuid, p_display_name text, p_except uuid default null)
returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.members
    where group_id = p_group_id
      and lower(btrim(display_name)) = lower(btrim(p_display_name))
      and id is distinct from p_except);
$$;

create function public.add_member(p_group_id uuid, p_display_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_group public.groups := public._lock_owned_group(p_group_id, v_uid);
  v_member_id uuid;
  v_name text := btrim(p_display_name);
begin
  if public.is_archived(p_group_id) then
    perform public._raise('group_archived');
  end if;
  if v_group.status <> 'open' then
    perform public._raise('group_not_open');
  end if;
  if not public._valid_member_name(p_display_name) then
    perform public._raise('invalid_input');
  end if;
  if (select count(*) from public.members where group_id = p_group_id) >= 100 then
    perform public._raise('member_limit');
  end if;
  if public._member_name_taken(p_group_id, v_name) then
    perform public._raise('name_taken');
  end if;

  insert into public.members (group_id, display_name)
  values (p_group_id, v_name)
  returning id into v_member_id;

  perform public._log_event(p_group_id, 'member_added', v_member_id, v_name);

  return jsonb_build_object(
    'member_id', v_member_id,
    'token', (select token from public.member_invites where member_id = v_member_id));
end;
$$;

create function public.rename_member(p_member_id uuid, p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_member public.members := public._lock_owned_member(p_member_id, v_uid);
  v_group public.groups;
  v_name text := btrim(p_display_name);
begin
  select * into v_group from public.groups where id = v_member.group_id;
  if public.is_archived(v_group.id) then
    perform public._raise('group_archived');
  end if;
  if not public._valid_member_name(p_display_name) then
    perform public._raise('invalid_input');
  end if;
  if public._member_name_taken(v_group.id, v_name, p_member_id) then
    perform public._raise('name_taken');
  end if;

  update public.members set display_name = v_name where id = p_member_id;
  perform public._log_event(v_group.id, 'member_renamed', p_member_id, v_name);
end;
$$;

create function public.remove_member(p_member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_member public.members := public._lock_owned_member(p_member_id, v_uid);
  v_group public.groups;
begin
  select * into v_group from public.groups where id = v_member.group_id;
  if public.is_archived(v_group.id) then
    perform public._raise('group_archived');
  end if;
  if v_group.status <> 'open' then
    perform public._raise('group_not_open');
  end if;

  -- R13: exclusiones, lista de deseos y link se borran en cascada
  delete from public.members where id = p_member_id;
  perform public._log_event(v_group.id, 'member_removed', null, v_member.display_name);
end;
$$;

create function public.get_invite_links(p_group_id uuid)
returns table (
  member_id uuid,
  display_name text,
  token text,
  claimed boolean,
  result_viewed boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = v_uid) then
    perform public._raise('not_owner');
  end if;

  return query
  select m.id, m.display_name, i.token, m.user_id is not null, m.result_viewed_at is not null
  from public.members m
  join public.member_invites i on i.member_id = m.id
  where m.group_id = p_group_id
  order by m.created_at, m.id;
end;
$$;

create function public.regenerate_invite(p_member_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_member public.members := public._lock_owned_member(p_member_id, v_uid);
  v_group public.groups;
  v_token text := public._new_invite_token();
begin
  select * into v_group from public.groups where id = v_member.group_id;
  if public.is_archived(v_group.id) then
    perform public._raise('group_archived');
  end if;

  update public.member_invites set token = v_token, created_at = now() where member_id = p_member_id;
  -- R12: se libera el reclamo. result_viewed_at se conserva (docs/DECISIONS.md, I12)
  update public.members set user_id = null, claimed_at = null where id = p_member_id;
  perform public._log_event(v_group.id, 'invite_regenerated', p_member_id, v_member.display_name,
                            v_member.user_id);
  return v_token;
end;
$$;

create function public.open_invite(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._uid();
  v_member public.members;
  v_owner_id uuid;
begin
  select m.* into v_member
  from public.member_invites i
  join public.members m on m.id = i.member_id
  where i.token = p_token
  for update of m;
  if not found then
    perform public._raise('invalid_token');
  end if;

  if v_member.user_id = v_uid then
    return jsonb_build_object('group_id', v_member.group_id, 'member_id', v_member.id,
                              'status', 'already_yours');
  end if;
  if v_member.user_id is not null then
    perform public._raise('claimed_by_other');
  end if;

  -- R11. El dueño tampoco puede reclamar links de su grupo aunque no participe
  -- (docs/DECISIONS.md, I13)
  select owner_id into v_owner_id from public.groups where id = v_member.group_id;
  if v_owner_id = v_uid
     or exists (select 1 from public.members
                where group_id = v_member.group_id and user_id = v_uid) then
    perform public._raise('already_member');
  end if;

  begin
    update public.members set user_id = v_uid, claimed_at = now() where id = v_member.id;
  exception when unique_violation then
    perform public._raise('already_member');
  end;
  perform public._log_event(v_member.group_id, 'invite_claimed', v_member.id, v_member.display_name);

  return jsonb_build_object('group_id', v_member.group_id, 'member_id', v_member.id,
                            'status', 'claimed');
end;
$$;

grant execute on function
  public.add_member(uuid, text),
  public.rename_member(uuid, text),
  public.remove_member(uuid),
  public.get_invite_links(uuid),
  public.regenerate_invite(uuid),
  public.open_invite(text)
to authenticated;
