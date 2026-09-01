-- v0.4.1: alinea la cardinalidad de grupos con la UI.
-- Una alumna puede pertenecer como máximo a un grupo.
-- No resolvemos duplicados silenciosamente porque cambiaría permisos sin una decisión explícita.

do $$
begin
  if exists (
    select 1
    from public.group_members
    group by profile_id
    having count(*) > 1
  ) then
    raise exception 'group_members contiene alumnas con más de un grupo; resolver esos casos antes de aplicar 0004_hardening.sql';
  end if;
end
$$;

alter table public.group_members
  drop constraint if exists group_members_pkey;

alter table public.group_members
  add constraint group_members_pkey primary key (profile_id);
