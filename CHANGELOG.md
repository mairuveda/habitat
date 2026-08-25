# v0.4.0

Incluye todo v0.3 y agrega:

- Upload de videos desde equipo o Google Drive mediante Cloudinary Upload Widget.
- Upload firmado por `/api/cloudinary/sign` y validación de rol admin.
- Requisito de delivery type `authenticated` para publicar nuevas clases.
- Publicación para todos o para grupos específicos.
- Biblioteca de alumnas filtrada por Supabase RLS.
- Reproductor que solicita `/api/classes/:id/playback` con JWT y no guarda URL de reproducción en la DB.
- URLs de Cloudinary firmadas en el Worker; API secret sólo server-side.
- Pausar/reactivar clases desde admin.
