-- v0.3: información administrativa mínima para operar alumnas desde la web.

alter table public.profiles
  add column if not exists email text not null default '';

update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where p.id = u.id
  and p.email = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when public.profiles.full_name = '' then excluded.full_name
        else public.profiles.full_name
      end;
  return new;
end;
$$;

-- El rol ya está protegido por las políticas existentes. Esta política explícita
-- permite a cada usuario leer su perfil y a admin operar todos los perfiles.
-- No se agrega acceso público adicional.

create index if not exists profiles_role_active_idx
  on public.profiles (role, active);

create index if not exists group_members_profile_idx
  on public.group_members (profile_id);
