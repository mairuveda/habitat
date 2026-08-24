# Hábitat Pilates

Implementación inicial del sitio público, área de alumnos y dashboard administrativo de **Hábitat · Fluir en Movimiento**.

## Stack

- Astro + TypeScript
- React islands para login, biblioteca y dashboard
- Supabase Free: Auth + PostgreSQL + RLS
- Cloudinary Free: video demo + Upload Widget (incluye Google Drive)
- Cloudflare Pages Free: hosting estático + Pages Function para firma de uploads

## Estado actual

- Home responsive basada en el mockup aprobado.
- Login de alumnos preparado para Supabase. Sin variables de entorno entra en modo visual para poder revisar la UI.
- Biblioteca de alumno con filtros funcionales y reproductor modal.
- Si Supabase está conectado, la biblioteca consulta clases reales respetando RLS; si no, usa datos visuales de demo.
- Dashboard admin responsive.
- Widget de Cloudinary preparado para upload firmado desde equipo / Google Drive.
- Flujo end-to-end preparado: upload Cloudinary → guardar metadata en Supabase → biblioteca del alumno → reproducción.
- Esquema Supabase + RLS incluido en `supabase/migrations/0001_initial.sql`.
- API de firma en `functions/api/cloudinary/sign.ts`, protegida por sesión Supabase + rol `admin`.

## Ejecutar

```bash
npm install
cp .env.example .env
npm run dev
```

La home queda en `http://localhost:4321/`, el acceso alumnos en `/alumnos`, el dashboard visual en `/alumnos/dashboard` y administración en `/admin`.

## Conectar Supabase

1. Crear un proyecto en Supabase Free.
2. Ejecutar `supabase/migrations/0001_initial.sql` en SQL Editor.
3. Copiar URL y anon key a `.env`.
4. Crear usuarios desde Supabase Auth.
5. Para el usuario administrador, insertar/actualizar su fila en `profiles` con `role = 'admin'`.

## Conectar Cloudinary

Crear cuenta Free y configurar:

```env
PUBLIC_CLOUDINARY_CLOUD_NAME=...
PUBLIC_CLOUDINARY_API_KEY=...
```

En Cloudflare Pages agregar secretos del lado servidor:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
CLOUDINARY_API_SECRET
```

No guardar `CLOUDINARY_API_SECRET` en `.env` que se publique ni usar prefijo `PUBLIC_`.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Las Pages Functions se detectan desde `/functions`.

## Próxima iteración

1. Persistir creación/edición de clases en Supabase desde Admin.
2. Proteger rutas visuales con sesión real.
3. Cargar alumnos desde CSV para que la operación no dependa de saber código.
4. Añadir reproductor y URLs de reproducción controladas por el `VideoProvider`.
5. Agregar límites de uso para conservar el costo de demo en USD 0.
