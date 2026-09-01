import { useEffect, useMemo, useState } from "react";
import { listGroups, type StudioGroup } from "@/lib/admin/students";
import {
  deleteClassAndVideo,
  listAdminClasses,
  setClassPublished,
  type AdminPilatesClass
} from "@/lib/classes";
import { NewClassDialog } from "./AdminCreateDialogs";

export default function AdminClasses() {
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [classes, setClasses] = useState<AdminPilatesClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminPilatesClass | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [groupData, classData] = await Promise.all([listGroups(), listAdminClasses()]);
      setGroups(groupData);
      setClasses(classData);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cargar las clases.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const publishedCount = useMemo(() => classes.filter((item) => item.published).length, [classes]);
  const pausedCount = classes.length - publishedCount;

  async function toggleClass(item: AdminPilatesClass) {
    try {
      await setClassPublished(item.id, !item.published);
      setClasses((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, published: !item.published } : entry
        )
      );
      setStatus(item.published ? "Clase pausada." : "Clase publicada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cambiar la publicación.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;

    const target = deleteTarget;
    setDeleting(true);
    setStatus(null);

    try {
      const result = await deleteClassAndVideo(target.id);
      setClasses((current) => current.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
      setStatus(
        result.video === "missing"
          ? `“${target.title}” fue eliminada. El video ya no existía en Cloudinary.`
          : `“${target.title}” y su video fueron eliminados correctamente.`
      );
    } catch (error) {
      setDeleteTarget(null);
      setStatus(error instanceof Error ? error.message : "No pudimos eliminar la clase.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div><h1>Clases</h1><p>Subí videos, publicá contenido, pausá o eliminá clases.</p></div>
        <button className="button" type="button" onClick={() => setDialogOpen(true)}>
          + Nueva clase
        </button>
      </div>

      <div className="stats stats-three">
        <div className="stat"><span>Totales</span><strong>{classes.length}</strong></div>
        <div className="stat"><span>Publicadas</span><strong>{publishedCount}</strong></div>
        <div className="stat"><span>Pausadas</span><strong>{pausedCount}</strong></div>
      </div>

      {status && <p className="admin-status" role="status">{status}</p>}

      <section className="panel">
        <div className="panel-heading compact">
          <div><h2>Biblioteca</h2><p>Las alumnas sólo ven clases publicadas autorizadas por RLS.</p></div>
        </div>

        {loading ? <p className="empty-admin">Cargando…</p> : (
          <div className="class-management-list">
            {classes.map((item) => (
              <article className="class-management-row" key={item.id}>
                <img src={item.image} alt="" />

                <div className="class-management-body">
                  <strong>{item.title}</strong>
                  <small>{item.duration || "—"} min · {item.category} · {item.level}</small>
                  {item.description && <p>{item.description}</p>}
                </div>

                <div className="class-management-actions">
                  <button
                    className={item.published ? "publish-toggle on" : "publish-toggle"}
                    type="button"
                    disabled={deleting}
                    onClick={() => void toggleClass(item)}
                  >
                    {item.published ? "Publicada" : "Pausada"}
                  </button>

                  <button
                    className="delete-class-button"
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(item)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}

            {classes.length === 0 && (
              <p className="empty-admin">Todavía no hay clases. Usá “Nueva clase”.</p>
            )}
          </div>
        )}
      </section>

      {dialogOpen && (
        <NewClassDialog
          groups={groups}
          onClose={() => setDialogOpen(false)}
          onCreated={refresh}
          onStatus={setStatus}
        />
      )}

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <div
            className="admin-modal small delete-class-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-class-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              ×
            </button>

            <h2 id="delete-class-title">Eliminar clase</h2>
            <p>Esta acción elimina la clase y también su video de Cloudinary.</p>

            <div className="delete-class-warning">
              <strong>{deleteTarget.title}</strong>
              <span>La eliminación es permanente y no se puede deshacer.</span>
            </div>

            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>

              <button
                className="button danger"
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
