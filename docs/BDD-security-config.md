# BDD — configuración única y hardening OWASP Top 10:2025

## Feature: configuración única

### Scenario: el navegador necesita Supabase
Given que el Worker tiene `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`
When el navegador consulta `GET /api/config`
Then recibe únicamente esos valores públicos
And no recibe `SUPABASE_SECRET_KEY`.

### Scenario: Cloudinary necesita configuración pública
Given que el Worker tiene cloud name, API key y upload preset
When el widget de video inicia
Then obtiene esos valores desde `/api/config`
And no depende de variables `PUBLIC_*` de build.

### Scenario: falta un secreto
Given que falta `SUPABASE_SECRET_KEY` o `CLOUDINARY_API_SECRET`
When se consulta `/api/ready`
Then el servicio afectado aparece no operativo
And ningún secreto es devuelto al cliente.

## Feature: control de acceso

### Scenario: un alumno llama un endpoint admin
Given un JWT válido con rol student
When llama `POST /api/admin/students` o `DELETE /api/admin/classes/:id`
Then recibe 403
And no se ejecuta la operación.

### Scenario: una clase no pertenece al alumno
Given RLS no autoriza la clase
When el alumno solicita playback
Then recibe 404
And no obtiene la URL firmada.

## Feature: requests administrativos seguros

### Scenario: request cross-origin
Given una operación POST o DELETE
When `Origin` no coincide con el origen de Hábitat
Then la operación es rechazada con 403.

### Scenario: body excesivo
Given un JSON superior a 32 KiB
When llega a un endpoint administrativo
Then recibe 413
And el Worker no intenta procesarlo.

### Scenario: content type inválido
Given una operación que requiere JSON
When el request no usa `application/json`
Then recibe 415.

## Feature: upload seguro

### Scenario: parámetros inesperados de firma
Given un admin autenticado
When intenta solicitar firma para parámetros Cloudinary fuera del allowlist
Then el Worker rechaza la firma.

### Scenario: video público
Given una carga cuyo delivery type no es `authenticated`
When se intenta publicar la clase
Then la publicación es rechazada.

## Feature: cabeceras de seguridad

### Scenario: cualquier respuesta del sitio
When el Worker devuelve HTML, assets o API
Then agrega CSP
And X-Content-Type-Options
And Referrer-Policy
And frame-ancestors deny
And Permissions-Policy.

## Feature: errores y auditoría

### Scenario: acceso denegado
When falla autenticación o autorización
Then el Worker devuelve un mensaje genérico
And escribe un evento de seguridad sin token, contraseña ni secret.
