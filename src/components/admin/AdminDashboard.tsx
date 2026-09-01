import { useEffect, useMemo, useState } from "react";
import { listGroups, listStudents, type AdminStudent, type StudioGroup } from "@/lib/admin/students";
import { countClasses, listAdminClasses, type AdminPilatesClass } from "@/lib/classes";
import { NewClassDialog, NewGroupDialog, NewStudentDialog } from "./AdminCreateDialogs";

type Props = {
  adminName: string;
  routeNotice?: string | null;
};

type RuntimeServices = {
  auth: boolean;
  admin: boolean;
  videoUpload: boolean;
  videoPlayback: boolean;
  videoDelete: boolean;
};

type QuickAction = "group" | "student" | "class" | null;

export default function AdminDashboard({ adminName, routeNotice }: Props) {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [classes, setClasses] = useState<AdminPilatesClass[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [runtimeReady, setRuntimeReady] = useState<boolean | null>(null);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);

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
      setStatus(error instanceof Error ? error.message : "No pudimos cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRuntime() {
      try {
        const response = await fetch("/api/ready", { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as {
          ready?: boolean;
          services?: RuntimeServices;
        };

        if (!cancelled && typeof payload.ready === "boolean") {
          setRuntimeReady(payload.ready);
        }
      } catch {
        if (!cancelled) setRuntimeReady(false);
      }
    }

    void refresh();
    void loadRuntime();
    return () => { cancelled = true; };
  }, []);

  const activeCount = useMemo(() => students.filter((student) => student.active).length, [students]);
  const recentStudents = students.slice(0, 5);
  const recentClasses = classes.slice(0, 5);
  const runtimeWarning = runtimeReady === false
    ? "Hay servicios runtime incompletos. Revisá Ajustes antes de publicar contenido."
    : null;

  return (
    <main className="admin-main">
      <div className="admin-title">
        <div>
          <h1>Dashboard</h1>
          <p>Hola {adminName || "administradora"}. Resumen operativo del estudio.</p>
        </div>

        <div className="title-actions">
          <button className="button secondary" type="button" onClick={() => setQuickAction("group")}>
            + Grupo
          </button>
          <button className="button secondary" type="button" onClick={() => setQuickAction("student")}>
            + Alumna
          </button>
          <button className="button" type="button" onClick={() => setQuickAction("class")}>
            + Nueva clase
          </button>
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
          <div className="panel-heading compact">
            <div><h2>Alumnas recientes</h2><p>Estado y grupo actual.</p></div>
          </div>

          {loading ? <p className="empty-admin">Cargando…</p> : (
            <div className="student-table">
              <div className="student-row student-head">
                <span>Alumna</span><span>Grupo</span><span>Estado</span><span></span>
              </div>

              {recentStudents.map((student) => (
                <div className="student-row" key={student.id}>
                  <div>
                    <strong>{student.full_name || "Sin nombre"}</strong>
                    <small>{student.email}</small>
                  </div>
                  <span>{student.group_name ?? "Sin grupo"}</span>
                  <span className={student.active ? "status-pill active" : "status-pill"}>
                    {student.active ? "Activa" : "Suspendida"}
                  </span>
                  <span aria-hidden="true"></span>
                </div>
              ))}

              {recentStudents.length === 0 && <p className="empty-admin">Todavía no hay alumnas.</p>}
            </div>
          )}
        </section>

        <section className="panel classes-panel">
          <div className="panel-heading compact">
            <div><h2>Clases recientes</h2><p>Publicadas y pausadas.</p></div>
          </div>

          <div className="class-admin-list">
            {recentClasses.map((item) => (
              <div className="class-admin-row" key={item.id}>
                <img src={item.image} alt="" />
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.duration || "—"} min · {item.category}</small>
                </div>
                <span className={item.published ? "status-pill active" : "status-pill"}>
                  {item.published ? "Publicada" : "Pausada"}
                </span>
              </div>
            ))}
            {!loading && recentClasses.length === 0 && <p className="empty-admin">Todavía no hay clases.</p>}
          </div>
        </section>
      </div>

      {quickAction === "group" && (
        <NewGroupDialog
          onClose={() => setQuickAction(null)}
          onCreated={refresh}
          onStatus={setStatus}
        />
      )}

      {quickAction === "student" && (
        <NewStudentDialog
          groups={groups}
          onClose={() => setQuickAction(null)}
          onCreated={refresh}
          onStatus={setStatus}
        />
      )}

      {quickAction === "class" && (
        <NewClassDialog
          groups={groups}
          onClose={() => setQuickAction(null)}
          onCreated={refresh}
          onStatus={setStatus}
        />
      )}
    </main>
  );
}
