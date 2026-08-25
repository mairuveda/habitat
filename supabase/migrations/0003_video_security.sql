-- v0.4: metadata necesaria para no guardar URLs públicas de reproducción.

alter table public.classes
  add column if not exists video_delivery_type text not null default 'upload',
  add column if not exists video_format text,
  add column if not exists video_version bigint;

-- playback_url queda por compatibilidad con la v0.2, pero la v0.4 no lo usa
-- para nuevas clases. El reproductor solicita la URL al Worker después de que
-- Supabase/RLS autoriza a la alumna.

create index if not exists classes_published_created_idx
  on public.classes (published, created_at desc);
