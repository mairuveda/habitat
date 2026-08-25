# Deploy v0.3 — autenticación, roles, alumnas y grupos

La v0.3 mantiene Astro como sitio estático y usa **un único Cloudflare Worker** para `/api/*`.
El mismo Worker sirve los archivos de `dist/` mediante el binding `ASSETS`. No usa Astro SSR, KV ni Pages Functions.

## 1. Supabase

Ejecutar en **SQL Editor**, una sola vez:

```text
supabase/migrations/0002_admin_students.sql
```

No volver a ejecutar `0001_initial.sql` si ya se aplicó.

## 2. Cloudflare — Build variables

Conservar:

```text
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
```

La v0.3 también acepta el nombre nuevo:

```text
PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

No es necesario tener ambos `PUBLIC_*_KEY`; uno alcanza.

## 3. Cloudflare — Runtime variables / secrets

Agregar en el Worker:

```text
SUPABASE_URL=<mismo Project URL>
SUPABASE_PUBLISHABLE_KEY=<sb_publishable_...>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key de Supabase>
```

Si ya existe `SUPABASE_ANON_KEY`, puede mantenerse en vez de `SUPABASE_PUBLISHABLE_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` debe guardarse como **Secret** y nunca usar prefijo `PUBLIC_`.

## 4. Build y deploy

Cloudflare puede mantener:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

`wrangler.jsonc` ya está incluido y evita la autoconfiguración anterior de Astro/Cloudflare.

## 5. Prueba

1. `/api/health` debe devolver `{"ok":true,"version":"0.3.0"}`.
2. Credenciales falsas deben ser rechazadas en `/alumnos`.
3. Alumna activa entra a `/alumnos/dashboard`.
4. Alumna suspendida es expulsada y no puede volver a entrar.
5. Alumna no puede abrir `/admin`.
6. Admin puede abrir `/admin`, crear grupos, crear alumnas, suspender/reactivar y cambiar grupo.
7. Al crear alumna sin contraseña, el panel muestra una contraseña temporal para copiar.
