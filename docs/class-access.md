# Acceso a clases

El acceso se resuelve con dos niveles, sin crear un framework genérico de permisos.

## Regla base

Cada clase tiene un `access_scope`:

- `all`: todas las alumnas activas.
- `selected`: sólo las alumnas de grupos presentes en `class_groups`.
- `none`: nadie por herencia.

## Excepción individual

`class_student_access` sobrescribe la regla base para una alumna y una clase:

- `allowed = true`: permiso explícito.
- `allowed = false`: bloqueo explícito.
- sin fila: hereda la regla base.

La excepción individual siempre prevalece sobre el grupo.

## Seguridad

La UI administrativa no decide el acceso real. Supabase RLS aplica la misma regla al `SELECT` de `classes`, y el endpoint de playback del alumno vuelve a consultar `classes` usando su JWT.

El preview administrativo usa un endpoint separado:

`GET /api/admin/classes/:id/playback`

Ese endpoint requiere `requireAdmin()` y permite revisar clases publicadas o pausadas sin debilitar el playback del alumno.
