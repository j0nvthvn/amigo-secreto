-- 0003_triggers.sql
-- Los triggers de tiempo real y avisos se agregan en M5 y M6.

-- 128 bits aleatorios en base64url sin relleno: 22 caracteres (R9)
create function public._new_invite_token() returns text
language sql volatile security definer set search_path = '' as $$
  select translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_');
$$;

-- Cada miembro tiene su link personal desde que se crea
create function public._members_create_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.member_invites (member_id, token)
  values (new.id, public._new_invite_token());
  return new;
end;
$$;

create trigger members_create_invite
  after insert on public.members
  for each row execute function public._members_create_invite();

-- R24: máximo 10 ítems por miembro. Bloquea al miembro para que dos inserciones
-- simultáneas no pasen ambas el conteo.
create function public._wishlist_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.members where id = new.member_id for update;
  if (select count(*) from public.wishlist_items where member_id = new.member_id) >= 10 then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  return new;
end;
$$;

create trigger wishlist_limit
  before insert on public.wishlist_items
  for each row execute function public._wishlist_limit();
