import { useEffect, useMemo, useState } from "react";
import CloudinaryUpload, { type UploadResult } from "./CloudinaryUpload";
import { listGroups, type StudioGroup } from "@/lib/admin/students";
import {
  createClass,
  listAdminClasses,
  setClassPublished,
  type AdminPilatesClass
} from "@/lib/classes";

export default function AdminClasses() {
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [classes, setClasses] = useState<AdminPilatesClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function submitClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!uploaded) {
      setStatus("Primero subí el video.");
      return;
    }
    if ((uploaded.type ?? "upload") !== "authenticated") {
      setStatus("Ese video no quedó privado. Revisá el preset de Cloudinary y volvé a subirlo.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const groupIds = form.getAll("groupIds").map(String).filter(Boolean);
    setSaving(true);

    try {
      await createClass({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        category: String(form.get("category") ?? "Viajes"),
        level: String(form.get("level") ?? "Todos"),
        durationMinutes: uploaded.duration ? Math.max(1, Math.round(uploaded.duration / 60)) : undefined,
        videoProvider: "cloudinary",
        videoRef: uploaded.public_id,
        videoDeliveryType: "authenticated",
        videoFormat: uploaded.format,
        videoVersion: uploaded.version,
        published: true,
        groupIds
      });
      formElement.reset();
      setUploaded(null);
      setDialogOpen(false);
      await refresh();
      setStatus(groupIds.length > 0 ? "Clase publicada para los grupos seleccionados." : "Clase publicada para todas las alumnas activas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos publicar la clase.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleClass(item: AdminPilatesClass) {
    try {
      await setClassPublished(item.id, !item.published);
      setClasses((current) => current.map((entry) => entry.id === item.id ? { ...entry, published: !item.published } : entry));
      setStatus(item.published ? "Clase pausada." : "Clase publicada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cambiar la publicación.");
    }
  }

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div><h1>Clases</h1><p>Subí videos, publicá contenido y pausá clases sin eliminarlo.</p></div>
        <button className="button" type="button" onClick={() => { setUploaded(null); setDialogOpen(true); }}>+ Nueva clase</button>
      </div>

      <div className="stats stats-three">
        <div className="stat"><span>Totales</span><strong>{classes.length}</strong></div>
        <div className="stat"><span>Publicadas</span><strong>{publishedCount}</strong></div>
        <div className="stat"><span>Pausadas</span><strong>{pausedCount}</strong></div>
      </div>

      {status && <p className="admin-status" role="status">{status}</p>}

      <section className="panel">
        <div className="panel-heading compact"><div><h2>Biblioteca</h2><p>Las alumnas sólo ven clases publicadas autorizadas por RLS.</p></div></div>
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
                <button className={item.published ? "publish-toggle on" : "publish-toggle"} type="button" onClick={() => void toggleClass(item)}>
                  {item.published ? "Publicada" : "Pausada"}
                </button>
              </article>
            ))}
            {classes.length === 0 && <p className="empty-admin">Todavía no hay clases. Usá “Nueva clase”.</p>}
          </div>
        )}
      </section>

      {dialogOpen && (
        <div className="modal-backdrop" onClick={() => setDialogOpen(false)}>
          <form className="admin-modal class-modal" onSubmit={submitClass} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDialogOpen(false)}>×</button>
            <h2>Nueva clase</h2>
            <p>Subí desde tu equipo o Google Drive y elegí quién puede verla.</p>
            <CloudinaryUpload onUploaded={setUploaded} />
            <div className={uploaded?.type === "authenticated" ? "upload-security ok" : "upload-security"}>
              {uploaded ? `Video: ${uploaded.type ?? "upload"} · ${uploaded.format ?? "video"}` : "Video pendiente"}
            </div>
            <label>Título<input name="title" placeholder="Ej: Pilates en tu maleta" required /></label>
            <label>Descripción<textarea name="description" placeholder="Rutina ideal para viajes…" /></label>
            <div className="form-row">
              <label>Categoría<select name="category"><option>Viajes</option><option>Movilidad</option><option>Quick Flow</option><option>Fuerza</option></select></label>
              <label>Nivel<select name="level"><option>Principiante</option><option>Intermedio</option><option>Todos</option></select></label>
            </div>
            <fieldset className="group-access">
              <legend>Disponible para</legend>
              <p>Sin seleccionar grupos, la clase queda disponible para todas las alumnas activas.</p>
              {groups.filter((group) => group.active).map((group) => (
                <label className="check-row" key={group.id}>
                  <input type="checkbox" name="groupIds" value={group.id} />
                  {group.name}
                </label>
              ))}
            </fieldset>
            <button className="button full" type="submit" disabled={saving}>{saving ? "Publicando…" : "Publicar clase"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
