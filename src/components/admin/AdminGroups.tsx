import { useEffect, useMemo, useState } from "react";
import { createGroup, listGroups, listStudents, type AdminStudent, type StudioGroup } from "@/lib/admin/students";

export default function AdminGroups() {
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [groupData, studentData] = await Promise.all([listGroups(), listStudents()]);
      setGroups(groupData);
      setStudents(studentData);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cargar los grupos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const activeGroups = useMemo(() => groups.filter((group) => group.active), [groups]);
  const withoutGroup = useMemo(() => students.filter((student) => !student.group_id), [students]);

  async function submitGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createGroup(String(form.get("name") ?? ""));
      formElement.reset();
      setDialogOpen(false);
      await refresh();
      setStatus("Grupo creado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos crear el grupo.");
    }
  }

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div><h1>Grupos</h1><p>Organizá alumnas y controlá el acceso a clases por grupo.</p></div>
        <button className="button" type="button" onClick={() => setDialogOpen(true)}>+ Nuevo grupo</button>
      </div>

      <div className="stats stats-three">
        <div className="stat"><span>Grupos activos</span><strong>{activeGroups.length}</strong></div>
        <div className="stat"><span>Alumnas asignadas</span><strong>{students.length - withoutGroup.length}</strong></div>
        <div className="stat"><span>Sin grupo</span><strong>{withoutGroup.length}</strong></div>
      </div>

      {status && <p className="admin-status" role="status">{status}</p>}

      <section className="panel">
        <div className="panel-heading compact">
          <div><h2>Distribución</h2><p>La asignación de alumnas se administra desde la página Alumnas.</p></div>
        </div>

        {loading ? <p className="empty-admin">Cargando…</p> : (
          <div className="group-grid">
            {groups.map((group) => {
              const members = students.filter((student) => student.group_id === group.id);
              return (
                <article className="group-card" key={group.id}>
                  <div className="group-card-head">
                    <div>
                      <h3>{group.name}</h3>
                      <span className={group.active ? "status-pill active" : "status-pill"}>{group.active ? "Activo" : "Inactivo"}</span>
                    </div>
                    <strong>{members.length}</strong>
                  </div>
                  <p>{members.length === 1 ? "1 alumna" : `${members.length} alumnas`}</p>
                  <div className="group-members">
                    {members.slice(0, 5).map((student) => <span key={student.id}>{student.full_name || student.email}</span>)}
                    {members.length === 0 && <span className="muted-item">Sin alumnas asignadas</span>}
                    {members.length > 5 && <span>+ {members.length - 5} más</span>}
                  </div>
                </article>
              );
            })}

            <article className="group-card unassigned-card">
              <div className="group-card-head"><div><h3>Sin grupo</h3><span className="status-pill">Pendientes</span></div><strong>{withoutGroup.length}</strong></div>
              <p>Alumnas sin una asignación específica.</p>
              <div className="group-members">
                {withoutGroup.slice(0, 5).map((student) => <span key={student.id}>{student.full_name || student.email}</span>)}
                {withoutGroup.length === 0 && <span className="muted-item">Todas las alumnas tienen grupo</span>}
              </div>
            </article>
          </div>
        )}

        <div className="panel-footer-action"><a className="button secondary" href="/admin/alumnas">Asignar alumnas</a></div>
      </section>

      {dialogOpen && (
        <div className="modal-backdrop" onClick={() => setDialogOpen(false)}>
          <form className="admin-modal small" onSubmit={submitGroup} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDialogOpen(false)}>×</button>
            <h2>Nuevo grupo</h2>
            <p>Creá el grupo y luego asigná alumnas desde su listado.</p>
            <label>Nombre<input name="name" placeholder="Ej: Viajeras" required /></label>
            <button className="button full" type="submit">Crear grupo</button>
          </form>
        </div>
      )}
    </main>
  );
}
