# OWASP Top 10:2025 — estado de Hábitat

Este documento registra los controles implementados en el repositorio. No constituye una certificación de seguridad.

| OWASP 2025 | Control principal | Estado |
|---|---|---|
| A01 Broken Access Control | Supabase RLS + `requireAdmin` + JWT playback | Implementado |
| A02 Security Misconfiguration | runtime config única + readiness + security headers | Implementado |
| A03 Software Supply Chain Failures | lockfile + Dependabot + audit script | Implementado |
| A04 Cryptographic Failures | secrets server-only + HTTPS/HSTS + SHA-256 Upload API | Implementado |
| A05 Injection | query builder + validation + body limits + signing allowlist | Implementado |
| A06 Insecure Design | publish-safe + private video + coordinated delete | Implementado |
| A07 Authentication Failures | generic errors + JWT revalidation + sessionStorage | Implementado en app; rate limits/CAPTCHA dependen de Supabase |
| A08 Software/Data Integrity Failures | server-side signed upload + fixed preset/folder | Implementado |
| A09 Security Logging/Alerting Failures | structured security events + Cloudflare observability | Logging implementado; alerting externo por configurar |
| A10 Mishandling Exceptional Conditions | bounded input + safe failure states + explicit HTTP errors | Implementado |

## Controles operativos fuera del código

Antes de producción:

1. Mantener MFA habilitado para las cuentas administrativas de Supabase y Cloudflare.
2. Revisar rate limits y protección anti-bot/CAPTCHA de Supabase Auth.
3. Configurar alertas de Cloudflare para errores 401/403/5xx anómalos si el plan lo permite.
4. Ejecutar `pnpm run security:audit` en CI o antes de cada release.
5. No copiar `.env` ni secrets a issues, logs, commits o capturas.
