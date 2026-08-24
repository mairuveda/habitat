create type public.user_role as enum ('admin', 'student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'student',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.group_members (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (profile_id, group_id)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null,
  level text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  video_provider text not null default 'cloudinary',
  video_ref text not null,
  playback_url text,
  thumbnail_url text,
  published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.class_groups (
  class_id uuid not null references public.classes(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (class_id, group_id)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.classes enable row level security;
alter table public.class_groups enable row level security;

create policy "profile own read"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "admin manages profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated reads groups"
on public.groups for select to authenticated
using (active = true or public.is_admin());

create policy "admin manages groups"
on public.groups for all
using (public.is_admin())
with check (public.is_admin());

create policy "member reads own memberships"
on public.group_members for select
using (profile_id = auth.uid() or public.is_admin());

create policy "admin manages memberships"
on public.group_members for all
using (public.is_admin())
with check (public.is_admin());

create policy "student reads assigned published classes"
on public.classes for select
using (
  public.is_admin()
  or (
    published = true
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active = true)
    and (
      not exists (select 1 from public.class_groups cg where cg.class_id = classes.id)
      or exists (
        select 1
        from public.class_groups cg
        join public.group_members gm on gm.group_id = cg.group_id
        where cg.class_id = classes.id and gm.profile_id = auth.uid()
      )
    )
  )
);

create policy "admin manages classes"
on public.classes for all
using (public.is_admin())
with check (public.is_admin());

create policy "student reads class group assignments"
on public.class_groups for select
using (
  public.is_admin()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = class_groups.group_id and gm.profile_id = auth.uid()
  )
);

create policy "admin manages class group assignments"
on public.class_groups for all
using (public.is_admin())
with check (public.is_admin());
