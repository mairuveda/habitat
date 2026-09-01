# SDD — preview y readiness de runtime

## Decisión

Mantener la arquitectura actual:

Astro static → Cloudflare Worker `/api/*` → Supabase / Cloudinary.

No se agrega proxy, backend adicional, framework de health checks ni capa de services.

## Diseño

### Preview

- `pnpm preview`: build + Wrangler en `127.0.0.1:8787`.
- `pnpm preview:share`: mismo runtime + Quick Tunnel explícito.
- `localhost` es el endpoint canónico de desarrollo.
- `trycloudflare.com` se usa sólo para compartir y se trata como efímero.

### Worker

`runtimeReadiness(env)` es la única fuente de verdad para configuración runtime.

Capacidades explícitas:

- `auth`
- `admin`
- `videoUpload`
- `videoPlayback`
- `videoDelete`

`GET /api/health` es liveness y no afirma readiness.

`GET /api/ready` responde:
- 200 cuando todas las capacidades están disponibles.
- 503 cuando falta configuración.
- `missing` contiene nombres de configuración, nunca secretos.

### Upload

`POST /api/cloudinary/sign` conserva `requireAdmin`.
Si la configuración de video no está completa, falla temprano con 503 y diagnóstico.

### UI admin

Dashboard y Ajustes consultan `/api/ready`.
Ajustes conserva información técnica dentro de "Diagnóstico técnico".
El estado visible al usuario sigue siendo simple: Cuenta, Administración y Videos.

## Principios

- una sola fuente de verdad;
- funciones pequeñas y explícitas;
- fail fast;
- errores concretos;
- sin abstracciones genéricas;
- sin dependencias nuevas;
- sin hardcodear credenciales.
