import { useEffect, useMemo, useState } from "react";
import {
  listGroups,
  listStudents,
  setStudentActive,
  setStudentGroup,
  type AdminStudent,
  type StudioGroup
} from "@/lib/admin/students";
import { NewStudentDialog } from "./AdminCreateDialogs";
import AdminStudentAccessDialog from "./AdminStudentAccessDialog";

export default function AdminStudents() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<AdminStudent | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [studentData, groupData] = await Promise.all([listStudents(), listGroups()]);
      setStudents(studentData);
      setGroups(groupData);

      if (permissionTarget) {
        const updated = studentData.find((item) => item.id === permissionTarget.id);
        if (updated) setPermissionTarget(updated);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cargar las alumnas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const activeCount = useMemo(
    () => students.filter((student) => student.active).length,
    [students]
  );
  const withoutGroupCount = useMemo(
    () => students.filter((student) => !student.group_id).length,
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      `${student.full_name} ${student.email} ${student.group_name ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [students, search]);

  async function toggleStudent(student: AdminStudent) {
    try {
      await setStudentActive(student.id, !student.active);
      setStudents((current) =>
        current.map((item) =>
          item.id === student.id ? { ...item, active: !student.active } : item
        )
      );
      setStatus(student.active ? "Alumna suspendida." : "Alumna activada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cambiar el estado.");
    }
  }

  async function changeGroup(student: AdminStudent, groupId: string) {
    try {
      await setStudentGroup(student.id, groupId || null);
      const group = groups.find((item) => item.id === groupId);

      setStudents((current) =>
        current.map((item) =>
          item.id === student.id
            ? {
                ...item,
                group_id: group?.id ?? null,
                group_name: group?.name ?? null
              }
            : item
        )
      );

      setStatus(
        group
          ? `${student.full_name || "La alumna"} ahora pertenece a ${group.name}.`
          : "La alumna quedó sin grupo."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos asignar el grupo.");
    }
  }

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div>
          <h1>Alumnas</h1>
          <p>Gestioná cuenta, grupo y excepciones de acceso a clases.</p>
        </div>
        <button className="button" type="button" onClick={() => setDialogOpen(true)}>
          + Nueva alumna
        </button>
      </div>

      <div className="stats stats-three">
        <div className="stat"><span>Activas</span><strong>{activeCount}</strong></div>
        <div className="stat"><span>Totales</span><strong>{students.length}</strong></div>
        <div className="stat"><span>Sin grupo</span><strong>{withoutGroupCount}</strong></div>
      </div>

      {status && <p className="admin-status" role="status">{status}</p>}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Listado</h2>
            <p>El grupo define el acceso base; “Permisos” administra excepciones individuales.</p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, email o grupo…"
          />
        </div>

        {loading ? <p className="empty-admin">Cargando…</p> : (
          <div className="student-table">
            <div className="student-row student-head">
              <span>Alumna</span>
              <span>Grupo</span>
              <span>Estado</span>
              <span>Accesos</span>
              <span></span>
            </div>

            {filteredStudents.map((student) => (
              <div className="student-row" key={student.id}>
                <div>
                  <strong>{student.full_name || "Sin nombre"}</strong>
                  <small>{student.email}</small>
                </div>

                <select
                  aria-label={`Grupo de ${student.full_name}`}
                  value={student.group_id ?? ""}
                  onChange={(event) => void changeGroup(student, event.target.value)}
                >
                  <option value="">Sin grupo</option>
                  {groups.filter((group) => group.active).map((group) => (
                    <option value={group.id} key={group.id}>{group.name}</option>
                  ))}
                </select>

                <span className={student.active ? "status-pill active" : "status-pill"}>
                  {student.active ? "Activa" : "Suspendida"}
                </span>

                <button
                  className="permission-button"
                  type="button"
                  onClick={() => setPermissionTarget(student)}
                >
                  Permisos
                </button>

                <button
                  className="link-button"
                  type="button"
                  onClick={() => void toggleStudent(student)}
                >
                  {student.active ? "Suspender" : "Activar"}
                </button>
              </div>
            ))}

            {filteredStudents.length === 0 && (
              <p className="empty-admin">No encontramos alumnas.</p>
            )}
          </div>
        )}
      </section>

      {dialogOpen && (
        <NewStudentDialog
          groups={groups}
          onClose={() => setDialogOpen(false)}
          onCreated={refresh}
          onStatus={setStatus}
        />
      )}

      {permissionTarget && (
        <AdminStudentAccessDialog
          student={permissionTarget}
          onClose={() => setPermissionTarget(null)}
        />
      )}
    </main>
  );
}
