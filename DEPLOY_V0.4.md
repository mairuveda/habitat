# Deploy v0.4 — videos privados, Google Drive y acceso por grupos

La v0.4 es la primera versión end-to-end del caso principal:

```text
Admin → equipo/Google Drive → Cloudinary → clase → grupo → alumna → reproductor
```

## 1. Supabase

Si ya desplegaste v0.3, ejecutá solamente:

```text
supabase/migrations/0003_video_security.sql
```

Si venís de v0.2, ejecutá primero `0002_admin_students.sql` y luego `0003_video_security.sql`.

## 2. Cloudinary Free

En Cloudinary creá un **upload preset firmado** para Hábitat. Nombre sugerido:

```text
habitat_private
```

Configuración importante:

- Signed / authenticated upload preset.
- Delivery type: `authenticated`.
- Video formats: MP4.
- Para la demo Free, mantené los archivos por debajo de 100 MB.

El código vuelve a validar el resultado y no permite publicar una clase si Cloudinary responde con delivery type distinto de `authenticated`.

## 3. Cloudflare — Build variables

Agregar:

```text
PUBLIC_CLOUDINARY_CLOUD_NAME=<Cloud name>
PUBLIC_CLOUDINARY_API_KEY=<API key pública>
PUBLIC_CLOUDINARY_UPLOAD_PRESET=habitat_private
```

Conservar las variables Supabase de v0.3.

## 4. Cloudflare — Runtime variables / secrets

Agregar:

```text
CLOUDINARY_CLOUD_NAME=<Cloud name>
CLOUDINARY_UPLOAD_PRESET=habitat_private
CLOUDINARY_API_SECRET=<API secret>
```

`CLOUDINARY_API_SECRET` debe ser **Secret**.

Conservar:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY)
SUPABASE_SECRET_KEY (preferido) o SUPABASE_SERVICE_ROLE_KEY (legacy)
```

## 5. Build y deploy

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

`wrangler.jsonc` sirve `dist/` como Static Assets y ejecuta el Worker primero sólo en `/api/*`.

## 6. Prueba end-to-end

1. `/api/health` devuelve versión `0.4.0`.
2. Entrá como admin y creá dos grupos, por ejemplo `Viajeras` y `Mat mañana`.
3. Asigná una alumna a cada grupo.
4. `+ Nueva clase` → subir un MP4 corto desde equipo o Google Drive.
5. El estado del upload debe decir `authenticated`.
6. Seleccioná sólo `Viajeras` y publicá.
7. Ingresá con la alumna de `Viajeras`: debe ver y reproducir la clase.
8. Ingresá con la alumna de `Mat mañana`: no debe ver esa clase.
9. Publicá otra clase sin seleccionar grupos: la deben ver todas las alumnas activas.
10. Suspendé una alumna: al volver a entrar debe quedar bloqueada.

## Seguridad de la demo Free

- La DB nunca entrega `playback_url` a la alumna.
- El navegador pide `/api/classes/:id/playback` con su JWT.
- El Worker consulta la clase con el JWT del usuario, por lo que se aplican las políticas RLS existentes.
- Cloudinary `authenticated` requiere una URL firmada; el API secret nunca llega al navegador.
- La URL firmada de Cloudinary no es un token de sesión con expiración en el plan Free. Si alguien copia una URL ya autorizada, puede compartirla. Para una demo y biblioteca básica es aceptable; para control estricto anti-sharing habría que pasar a un sistema con tokens temporales, como Cloudflare Stream o una opción paga equivalente.
