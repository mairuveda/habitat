import { useEffect, useMemo, useState } from "react";
import {
  listGroups,
  listStudents,
  type AdminStudent,
  type StudioGroup
} from "@/lib/admin/students";
import {
  listAdminClasses,
  listClassAccessData,
  type AdminPilatesClass,
  type ClassGroupAssignment,
  type ClassStudentOverride
} from "@/lib/classes";
import { NewGroupDialog } from "./AdminCreateDialogs";

export default function AdminGroups() {
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [classes, setClasses] = useState<AdminPilatesClass[]>([]);
  const [assignments, setAssignments] = useState<ClassGroupAssignment[]>([]);
  const [overrides, setOverrides] = useState<ClassStudentOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [groupData, studentData, classData, accessData] = await Promise.all([
        listGroups(),
        listStudents(),
        listAdminClasses(),
        listClassAccessData()
      ]);
      setGroups(groupData);
      setStudents(studentData);
      setClasses(classData);
      setAssignments(accessData.groupAssignments);
      setOverrides(accessData.overrides);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pudimos cargar los grupos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.active),
    [groups]
  );
  const withoutGroup = useMemo(
    () => students.filter((student) => !student.group_id),
    [students]
  );

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div>
          <h1>Grupos</h1>
          <p>Visualizá qué alumnas y clases heredan permisos desde cada grupo.</p>
        </div>
        <button className="button" type="button" onClick={() => setDialogOpen(true)}>
          + Nuevo grupo
        </button>
      </div>

      <div className="stats stats-three">
        <div className="stat"><span>Grupos activos</span><strong>{activeGroups.length}</strong></div>
        <div className="stat">
          <span>Alumnas asignadas</span>
          <strong>{students.length - withoutGroup.length}</strong>
        </div>
        <div className="stat"><span>Sin grupo</span><strong>{withoutGroup.length}</strong></div>
      </div>

      {status && <p className="admin-status" role="status">{status}</p>}

      <section className="panel">
        <div className="panel-heading compact">
          <div>
            <h2>Distribución y acceso</h2>
            <p>Los permisos individuales pueden permitir o bloquear una clase aunque el grupo indique otra cosa.</p>
          </div>
        </div>

        {loading ? <p className="empty-admin">Cargando…</p> : (
          <div className="group-grid">
            {groups.map((group) => {
              const members = students.filter(
                (student) => student.group_id === group.id
              );
              const memberIds = new Set(members.map((student) => student.id));
              const classCount = classes.filter(
                (item) =>
                  item.access_scope === "selected"
                  && assignments.some(
                    (entry) =>
                      entry.class_id === item.id
                      && entry.group_id === group.id
                  )
              ).length;
              const exceptionCount = overrides.filter(
                (entry) => memberIds.has(entry.profile_id)
              ).length;

              return (
                <article className="group-card" key={group.id}>
                  <div className="group-card-head">
                    <div>
                      <h3>{group.name}</h3>
                      <span className={group.active ? "status-pill active" : "status-pill"}>
                        {group.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <strong>{members.length}</strong>
                  </div>

                  <div className="group-access-summary">
                    <span>
                      <strong>{classCount}</strong>
                      {classCount === 1 ? " clase asignada" : " clases asignadas"}
                    </span>
                    <span>
                      <strong>{exceptionCount}</strong>
                      {exceptionCount === 1 ? " excepción individual" : " excepciones individuales"}
                    </span>
                  </div>

                  <div className="group-members">
                    {members.slice(0, 5).map((student) => (
                      <span key={student.id}>{student.full_name || student.email}</span>
                    ))}
                    {members.length === 0 && (
                      <span className="muted-item">Sin alumnas asignadas</span>
                    )}
                    {members.length > 5 && <span>+ {members.length - 5} más</span>}
                  </div>
                </article>
              );
            })}

            <article className="group-card unassigned-card">
              <div className="group-card-head">
                <div>
                  <h3>Sin grupo</h3>
                  <span className="status-pill">Pendientes</span>
                </div>
                <strong>{withoutGroup.length}</strong>
              </div>

              <p>Estas alumnas sólo acceden a clases globales o con permiso individual.</p>

              <div className="group-members">
                {withoutGroup.slice(0, 5).map((student) => (
                  <span key={student.id}>{student.full_name || student.email}</span>
                ))}
                {withoutGroup.length === 0 && (
                  <span className="muted-item">Todas las alumnas tienen grupo</span>
                )}
              </div>
            </article>
          </div>
        )}
      </section>

      {dialogOpen && (
        <NewGroupDialog
          onClose={() => setDialogOpen(false)}
          onCreated={refresh}
          onStatus={setStatus}
        />
      )}
    </main>
  );
}
