-- v0.5.0: acceso base + excepciones individuales.
--
-- Precedencia:
-- 1. override individual
-- 2. alcance base (all / selected / none)
-- 3. published=false siempre bloquea al alumno

alter table public.classes
  add column if not exists access_scope text not null default 'all';

update public.classes c
set access_scope = 'selected'
where exists (
  select 1
  from public.class_groups cg
  where cg.class_id = c.id
);

alter table public.classes
  drop constraint if exists classes_access_scope_check;

alter table public.classes
  add constraint classes_access_scope_check
  check (access_scope in ('all', 'selected', 'none'));

create table if not exists public.class_student_access (
  class_id uuid not null references public.classes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (class_id, profile_id)
);

create index if not exists class_student_access_profile_id_idx
  on public.class_student_access(profile_id);

create index if not exists class_groups_group_id_idx
  on public.class_groups(group_id);

alter table public.class_student_access enable row level security;

drop policy if exists "student reads own class overrides"
  on public.class_student_access;

create policy "student reads own class overrides"
on public.class_student_access for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "admin manages class overrides"
  on public.class_student_access;

create policy "admin manages class overrides"
on public.class_student_access for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "student reads assigned published classes"
  on public.classes;

create policy "student reads assigned published classes"
on public.classes for select
using (
  public.is_admin()
  or (
    published = true
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active = true
        and p.role = 'student'
    )
    and (
      exists (
        select 1
        from public.class_student_access csa
        where csa.class_id = classes.id
          and csa.profile_id = auth.uid()
          and csa.allowed = true
      )
      or (
        not exists (
          select 1
          from public.class_student_access csa
          where csa.class_id = classes.id
            and csa.profile_id = auth.uid()
        )
        and (
          classes.access_scope = 'all'
          or (
            classes.access_scope = 'selected'
            and exists (
              select 1
              from public.class_groups cg
              join public.group_members gm
                on gm.group_id = cg.group_id
              where cg.class_id = classes.id
                and gm.profile_id = auth.uid()
            )
          )
        )
      )
    )
  )
);
