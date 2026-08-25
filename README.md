# Hábitat Pilates v0.4

Versión end-to-end del portal de alumnas de **Hábitat · Fluir en Movimiento**.

## Flujo principal

- Login real con Supabase.
- Admin crea/suspende alumnas y administra grupos.
- Admin sube un video desde equipo o Google Drive con Cloudinary Upload Widget.
- El upload debe quedar con delivery type `authenticated`.
- Admin publica la clase para todos o para grupos específicos.
- Supabase RLS decide qué clases puede consultar cada alumna.
- El reproductor solicita la URL al Worker sólo después de autenticar a la alumna.
- El Cloudinary API secret y el Supabase service role quedan exclusivamente en runtime.

## Stack

- Astro + React + TypeScript.
- Supabase Free: Auth + PostgreSQL + RLS.
- Cloudinary Free: demo de video + Google Drive.
- Cloudflare Worker Free: static assets + API.

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev
```

Para Worker + API:

```bash
npm run preview
```

## Deploy

Ver `DEPLOY_V0.4.md`.
