# BDD — preview y readiness de runtime

## Feature: preview local estable

### Scenario: desarrollo normal
Given que el desarrollador ejecuta `pnpm preview`
When Wrangler inicia
Then la aplicación queda disponible en `http://127.0.0.1:8787`
And no se crea un Quick Tunnel como requisito para usar la aplicación.

### Scenario: compartir la ejecución
Given que el desarrollador necesita abrir el preview desde otro dispositivo
When ejecuta `pnpm preview:share`
Then Wrangler crea explícitamente un túnel temporal
And la URL `trycloudflare.com` se considera temporal y no canónica.

## Feature: liveness y readiness separadas

### Scenario: Worker vivo
Given que el Worker está ejecutándose
When se consulta `GET /api/health`
Then responde HTTP 200
And informa únicamente que el proceso está vivo y su versión.

### Scenario: runtime completamente configurado
Given Supabase admin y Cloudinary están configurados
When se consulta `GET /api/ready`
Then responde HTTP 200
And `ready` es true
And auth, admin, videoUpload, videoPlayback y videoDelete son true.

### Scenario: falta credencial administrativa
Given falta `SUPABASE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
When se consulta `GET /api/ready`
Then responde HTTP 503
And auth puede continuar true
And admin, videoUpload y videoDelete son false
And `missing` indica la credencial administrativa faltante.

### Scenario: upload no está configurado
Given falta un requisito de Cloudinary
When el admin intenta firmar un upload
Then el Worker responde HTTP 503
And devuelve qué configuración falta sin exponer valores secretos.

## Feature: diagnóstico administrativo

### Scenario: readiness devuelve 503
Given el Worker está vivo pero incompleto
When Ajustes consulta `/api/ready`
Then la pantalla sigue leyendo el cuerpo de la respuesta
And muestra "Revisar"
And el diagnóstico técnico indica las variables faltantes.
