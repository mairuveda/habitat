import { useEffect, useMemo, useState } from "react";
import CloudinaryUpload, { type UploadResult } from "./CloudinaryUpload";
import {
  createGroup,
  createStudent,
  listGroups,
  listStudents,
  setStudentActive,
  setStudentGroup,
  type AdminStudent,
  type StudioGroup
} from "@/lib/admin/students";
import {
  countClasses,
  createClass,
  listAdminClasses,
  setClassPublished,
  type AdminPilatesClass
} from "@/lib/classes";

type Props = {
  adminName: string;
  routeNotice?: string | null;
};

type RuntimeServices = {
  auth: boolean;
  admin: boolean;
  video: boolean;
};

export default function AdminDashboard({ adminName, routeNotice }: Props) {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [classes, setClasses] = useState<AdminPilatesClass[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [services, setServices] = useState<RuntimeServices | null>(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const [savingClass, setSavingClass] = useState(false);
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const [studentData, groupData, classData, classesCount] = await Promise.all([
        listStudents(),
        listGroups(),
        listAdminClasses(),
        countClasses()
      ]);
      setStudents(studentData);
      setGroups(groupData);
      setClasses(classData);
      setClassCount(classesCount);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cargar la administración.");
    } finally {
      setLoading(false);
    }
  }

  async function checkRuntimeServices() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { services?: RuntimeServices };
      if (payload.services) setServices(payload.services);
    } catch {
      // La UI sigue operativa; las acciones individuales mostrarán su error si el Worker no responde.
    }
  }

  useEffect(() => {
    void refresh();
    void checkRuntimeServices();
  }, []);

  const activeCount = useMemo(() => students.filter((student) => student.active).length, [students]);
  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => `${student.full_name} ${student.email} ${student.group_name ?? ""}`.toLowerCase().includes(term));
  }, [students, search]);

  const runtimeWarning = useMemo(() => {
    if (!services) return null;
    const missing: string[] = [];
    if (!services.admin) missing.push("altas de alumnas");
    if (!services.video) missing.push("videos");
    return missing.length > 0
      ? `Configuración pendiente en Cloudflare: ${missing.join(" y ")}. El resto del panel sigue disponible.`
      : null;
  }, [services]);

  async function submitStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setTemporaryPassword(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const result = await createStudent({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? "") || undefined,
        groupId: String(form.get("groupId") ?? "") || null
      });
      setTemporaryPassword(result.temporaryPassword ?? null);
      formElement.reset();
      await refresh();
      if (!result.temporaryPassword) setStudentDialogOpen(false);
      setStatus("Alumna creada correctamente.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos crear la alumna.");
    }
  }

  async function submitGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await createGroup(String(form.get("name") ?? ""));
      formElement.reset();
      setGroupDialogOpen(false);
      await refresh();
      setStatus("Grupo creado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos crear el grupo.");
    }
  }

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
    setSavingClass(true);
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
      setClassDialogOpen(false);
      await refresh();
      setStatus(groupIds.length > 0 ? "Clase publicada para los grupos seleccionados." : "Clase publicada para todas las alumnas activas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos publicar la clase.");
    } finally {
      setSavingClass(false);
    }
  }

  async function toggleStudent(student: AdminStudent) {
    try {
      await setStudentActive(student.id, !student.active);
      setStudents((current) => current.map((item) => item.id === student.id ? { ...item, active: !student.active } : item));
      setStatus(student.active ? "Alumna suspendida." : "Alumna activada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cambiar el estado.");
    }
  }

  async function changeGroup(student: AdminStudent, groupId: string) {
    try {
      await setStudentGroup(student.id, groupId || null);
      const group = groups.find((item) => item.id === groupId);
      setStudents((current) => current.map((item) => item.id === student.id ? {
        ...item,
        group_id: group?.id ?? null,
        group_name: group?.name ?? null
      } : item));
      setStatus(group ? `${student.full_name || "La alumna"} ahora pertenece a ${group.name}.` : "La alumna quedó sin grupo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos asignar el grupo.");
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
        <div><h1>Dashboard</h1><p>Hola {adminName || "administradora"}. Todo lo cotidiano se gestiona desde acá.</p></div>
        <div className="title-actions">
          <button className="button secondary" type="button" onClick={() => setGroupDialogOpen(true)}>+ Grupo</button>
          <button className="button secondary" type="button" onClick={() => { setTemporaryPassword(null); setStudentDialogOpen(true); }}>+ Alumna</button>
          <button className="button" type="button" onClick={() => { setUploaded(null); setClassDialogOpen(true); }}>+ Nueva clase</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><span>Alumnas activas</span><strong>{activeCount}</strong></div>
        <div className="stat"><span>Alumnas totales</span><strong>{students.length}</strong></div>
        <div className="stat"><span>Grupos</span><strong>{groups.length}</strong></div>
        <div className="stat"><span>Clases</span><strong>{classCount}</strong></div>
      </div>

      {routeNotice && <p className="admin-status" role="status">{routeNotice}</p>}
      {runtimeWarning && <p className="admin-status" role="status">{runtimeWarning}</p>}
      {status && <p className="admin-status" role="status">{status}</p>}

      <div className="admin-content-grid">
        <section className="panel students-panel">
          <div className="panel-heading">
            <div><h2>Alumnas</h2><p>Activá, suspendé y asigná grupos.</p></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumna…" />
          </div>

          {loading ? <p className="empty-admin">Cargando…</p> : (
            <div className="student-table">
              <div className="student-row student-head"><span>Alumna</span><span>Grupo</span><span>Estado</span><span></span></div>
              {filteredStudents.map((student) => (
                <div className="student-row" key={student.id}>
                  <div><strong>{student.full_name || "Sin nombre"}</strong><small>{student.email}</small></div>
                  <select aria-label={`Grupo de ${student.full_name}`} value={student.group_id ?? ""} onChange={(event) => void changeGroup(student, event.target.value)}>
                    <option value="">Sin grupo</option>
                    {groups.filter((group) => group.active).map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
                  </select>
                  <span className={student.active ? "status-pill active" : "status-pill"}>{student.active ? "Activa" : "Suspendida"}</span>
                  <button className="link-button" type="button" onClick={() => void toggleStudent(student)}>{student.active ? "Suspender" : "Activar"}</button>
                </div>
              ))}
              {filteredStudents.length === 0 && <p className="empty-admin">No encontramos alumnas.</p>}
            </div>
          )}
        </section>

        <section className="panel classes-panel">
          <div className="panel-heading compact"><div><h2>Clases</h2><p>Publicadas y pausadas.</p></div></div>
          <div className="class-admin-list">
            {classes.map((item) => (
              <div className="class-admin-row" key={item.id}>
                <img src={item.image} alt="" />
                <div><strong>{item.title}</strong><small>{item.duration || "—"} min · {item.category}</small></div>
                <button className={item.published ? "publish-toggle on" : "publish-toggle"} type="button" onClick={() => void toggleClass(item)}>{item.published ? "Publicada" : "Pausada"}</button>
              </div>
            ))}
            {classes.length === 0 && <p className="empty-admin">Todavía no hay clases. Usá “Nueva clase”.</p>}
          </div>
        </section>
      </div>

      {studentDialogOpen && (
        <div className="modal-backdrop" onClick={() => setStudentDialogOpen(false)}>
          <form className="admin-modal" onSubmit={submitStudent} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setStudentDialogOpen(false)}>×</button>
            <h2>Nueva alumna</h2><p>Si dejás la contraseña vacía, generamos una temporal para copiar y enviar.</p>
            <label>Nombre completo<input name="fullName" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Grupo<select name="groupId"><option value="">Sin grupo</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
            <label>Contraseña temporal<input name="password" type="text" minLength={8} placeholder="Opcional" /></label>
            <button className="button full" type="submit">Crear alumna</button>
            {temporaryPassword && <div className="temporary-password"><span>Contraseña generada</span><strong>{temporaryPassword}</strong><button type="button" onClick={() => void navigator.clipboard.writeText(temporaryPassword)}>Copiar</button></div>}
          </form>
        </div>
      )}

      {groupDialogOpen && (
        <div className="modal-backdrop" onClick={() => setGroupDialogOpen(false)}>
          <form className="admin-modal small" onSubmit={submitGroup} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setGroupDialogOpen(false)}>×</button>
            <h2>Nuevo grupo</h2>
            <label>Nombre<input name="name" placeholder="Ej: Viajeras" required /></label>
            <button className="button full" type="submit">Crear grupo</button>
          </form>
        </div>
      )}

      {classDialogOpen && (
        <div className="modal-backdrop" onClick={() => setClassDialogOpen(false)}>
          <form className="admin-modal class-modal" onSubmit={submitClass} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setClassDialogOpen(false)}>×</button>
            <h2>Nueva clase</h2><p>Subí desde tu equipo o Google Drive y elegí quién puede verla.</p>
            <CloudinaryUpload onUploaded={setUploaded} />
            <div className={uploaded?.type === "authenticated" ? "upload-security ok" : "upload-security"}>
              {uploaded ? `Video: ${uploaded.type ?? "upload"} · ${uploaded.format ?? "video"}` : "Video pendiente"}
            </div>
            <label>Título<input name="title" placeholder="Ej: Pilates en tu maleta" required /></label>
            <label>Descripción<textarea name="description" placeholder="Rutina ideal para viajes…" /></label>
            <div className="form-row"><label>Categoría<select name="category"><option>Viajes</option><option>Movilidad</option><option>Quick Flow</option><option>Fuerza</option></select></label><label>Nivel<select name="level"><option>Principiante</option><option>Intermedio</option><option>Todos</option></select></label></div>
            <fieldset className="group-access"><legend>Disponible para</legend><p>Sin seleccionar grupos, la clase queda disponible para todas las alumnas activas.</p>{groups.map((group) => <label className="check-row" key={group.id}><input type="checkbox" name="groupIds" value={group.id} />{group.name}</label>)}</fieldset>
            <button className="button full" type="submit" disabled={savingClass}>{savingClass ? "Publicando…" : "Publicar clase"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
