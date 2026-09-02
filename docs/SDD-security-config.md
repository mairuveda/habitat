# SDD — configuración única y OWASP Top 10:2025

## Decisión

Mantener la arquitectura mínima:

```text
Browser
  |
  | GET /api/config   (sólo configuración pública)
  | Bearer JWT
  v
Cloudflare Worker
  |
  +-- Supabase
  +-- Cloudinary
```

No se agrega backend adicional, registry de servicios, framework de seguridad ni proxy.

## Configuración

Existe un único contrato runtime de siete variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_UPLOAD_PRESET
CLOUDINARY_API_SECRET
```

El navegador no lee `import.meta.env`.

`GET /api/config` expone sólo:

- Supabase URL;
- Supabase publishable key;
- Cloudinary cloud name;
- Cloudinary API key;
- Cloudinary upload preset.

Los dos secretos permanecen exclusivamente en el Worker.

## Controles

### A01 Broken Access Control
- RLS de Supabase continúa siendo la autorización de datos.
- `requireAdmin()` protege operaciones privilegiadas.
- playback consulta con JWT del alumno.
- operaciones mutables verifican same-origin.

### A02 Security Misconfiguration
- una sola configuración runtime;
- `/api/health` separado de `/api/ready`;
- CSP y security headers en todas las respuestas;
- ningún secret se devuelve en health/config/error.

### A03 Software Supply Chain Failures
- `pnpm-lock.yaml` versionado;
- Dependabot semanal;
- `pnpm run security:audit`;
- archivos MP4 de prueba excluidos del repositorio.

### A04 Cryptographic Failures
- secretos sólo en runtime;
- HTTPS/HSTS en entornos HTTPS;
- firma Upload API de Cloudinary con SHA-256;
- la firma específica de delivery URL conserva el algoritmo requerido por Cloudinary.

### A05 Injection
- Supabase query builder en lugar de SQL dinámico;
- validación explícita de longitudes/UUIDs;
- JSON limitado a 32 KiB;
- allowlist de parámetros firmables de Cloudinary.

### A06 Insecure Design
- publicación segura: clase comienza unpublished;
- video debe ser `authenticated`;
- borrado coordinado pausa antes de eliminar.

### A07 Authentication Failures
- mensajes de login genéricos;
- sessionStorage en vez de almacenamiento persistente indefinido;
- backend vuelve a validar JWT con Supabase.
- Los límites de intentos/CAPTCHA se administran en Supabase Auth y deben permanecer habilitados según el riesgo.

### A08 Software or Data Integrity Failures
- uploads firmados server-side;
- upload preset fijo;
- folder fijo;
- delivery privado validado antes de publicar.

### A09 Security Logging and Alerting Failures
- eventos estructurados `type=security`;
- nunca se loguean JWT, contraseñas o secrets;
- Cloudflare Observability continúa habilitado.
- Alertas externas deben configurarse en Cloudflare si se requiere notificación activa.

### A10 Mishandling of Exceptional Conditions
- límites de body;
- content-type estricto;
- status HTTP explícitos;
- mensajes externos genéricos;
- operaciones destructivas conservan estado seguro ante fallo parcial.

## Filosofía

- una fuente de verdad;
- código explícito;
- early returns;
- funciones pequeñas;
- no abstracciones genéricas anticipadas;
- ninguna dependencia nueva para seguridad.
