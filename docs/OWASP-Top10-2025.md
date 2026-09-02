# OWASP Top 10:2025 — estado de Hábitat

Este documento registra el baseline de seguridad aplicado a **todo el repositorio**: frontend Astro/React, autenticación, Worker/API, Supabase/RLS, Cloudinary, configuración y cadena de suministro. No constituye una certificación de seguridad.

El baseline se verifica automáticamente con `tests/unit/security-project.test.ts` y forma parte de `pnpm test`.

| OWASP 2025 | Cobertura en Hábitat | Estado |
|---|---|---|
| A01 Broken Access Control | Supabase RLS, JWT revalidado en Worker, `requireAdmin`, playback autorizado por usuario | Verificado en código |
| A02 Security Misconfiguration | configuración runtime única, security headers para assets y API, readiness separado | Verificado en código |
| A03 Software Supply Chain Failures | pnpm único, lockfile, Dependabot y `pnpm audit` | Verificado en repo; audit depende del registry |
| A04 Cryptographic Failures | secrets server-only, sessionStorage, HTTPS/HSTS, SHA-256 donde corresponde | Verificado en código |
| A05 Injection | React escaping, sin `innerHTML`/`eval`, query builder, límites de body, allowlist de firma | Verificado en código |
| A06 Insecure Design | publicación fail-safe, videos privados y eliminación coordinada | Verificado en código |
| A07 Authentication Failures | Supabase Auth, validación de perfil al entrar al shell, JWT revalidado en acciones sensibles | Verificado en código; rate limits/CAPTCHA son operativos |
| A08 Software/Data Integrity Failures | uploads firmados, preset/folder controlados y verificación de delete | Verificado en código |
| A09 Security Logging/Alerting Failures | eventos estructurados + Cloudflare observability | Logging verificado; alertas externas son operativas |
| A10 Mishandling Exceptional Conditions | límites, status explícitos, catch global y estados fail-closed | Verificado en código |

## Navegación autenticada

La validación visible de permisos ocurre al **entrar o recargar** un portal autenticado. La navegación interna no debe remontar el shell.

- Admin usa History API para cambiar secciones sin volver a ejecutar `useProtectedProfile`.
- Alumno mantiene el mismo shell; los accesos `Clases` y logo interceptan la navegación y no provocan reload.
- Las operaciones sensibles siguen revalidando JWT/rol en el Worker. Esto es intencional y no debe eliminarse.

## Riesgos residuales y controles operativos

1. Supabase Auth: revisar rate limits y activar CAPTCHA/anti-bot si el riesgo de credential stuffing lo justifica.
2. Cloudflare: configurar alertas para patrones anómalos de 401/403/5xx. `observability.enabled` garantiza logging/telemetría, no una alerta humana.
3. MFA: mantener MFA en las cuentas administrativas de Supabase, Cloudflare y GitHub.
4. CSP: actualmente permite `'unsafe-inline'` por compatibilidad con Astro/hydration. El repositorio compensa evitando APIs de inyección DOM; eliminarlo requiere nonces/hashes y prueba del build completo.
5. Antes de release ejecutar:

```bash
pnpm run security:check
pnpm run security:audit
pnpm run test:integration
```

Los tests de integración de Supabase se omiten si no existen las variables `TEST_SUPABASE_*`; para validar RLS contra una base real deben ejecutarse contra un entorno de prueba.
