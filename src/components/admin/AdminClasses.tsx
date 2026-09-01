import { useEffect, useMemo, useState } from "react";
import { listGroups, type StudioGroup } from "@/lib/admin/students";
import {
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

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div><h1>Clases</h1><p>Subí videos, publicá contenido y pausá clases sin eliminarlo.</p></div>
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

                <button
                  className={item.published ? "publish-toggle on" : "publish-toggle"}
                  type="button"
                  onClick={() => void toggleClass(item)}
                >
                  {item.published ? "Publicada" : "Pausada"}
                </button>
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
    </main>
  );
}
