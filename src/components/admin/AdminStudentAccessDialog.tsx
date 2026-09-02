import { useEffect, useMemo, useState } from "react";
import {
  listAdminClasses,
  listClassAccessData,
  setClassStudentOverride,
  type AdminPilatesClass,
  type ClassGroupAssignment,
  type ClassStudentOverride
} from "@/lib/classes";
import type { AdminStudent } from "@/lib/admin/students";
import {
  canConsumeClass,
  resolveConfiguredClassAccess
} from "@/lib/admin/access";

type Props = {
  student: AdminStudent;
  onClose: () => void;
};

export default function AdminStudentAccessDialog({
  student,
  onClose
}: Props) {
  const [classes, setClasses] = useState<AdminPilatesClass[]>([]);
  const [assignments, setAssignments] = useState<ClassGroupAssignment[]>([]);
  const [overrides, setOverrides] = useState<ClassStudentOverride[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listAdminClasses(), listClassAccessData()])
      .then(([classData, accessData]) => {
        if (cancelled) return;
        setClasses(classData);
        setAssignments(accessData.groupAssignments);
        setOverrides(accessData.overrides);
      })
      .catch(() => {
        if (!cancelled) setStatus("No pudimos cargar los permisos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classes;

    return classes.filter((item) =>
      `${item.title} ${item.category} ${item.level}`
        .toLowerCase()
        .includes(term)
    );
  }, [classes, search]);

  const effectiveCount = useMemo(
    () => classes.filter((item) =>
      canConsumeClass(item, student, assignments, overrides)
    ).length,
    [assignments, classes, overrides, student]
  );

  async function changeOverride(
    item: AdminPilatesClass,
    allowed: boolean | null
  ) {
    if (savingClassId) return;

    setSavingClassId(item.id);
    setStatus(null);

    try {
      await setClassStudentOverride(item.id, student.id, allowed);

      setOverrides((current) => {
        const without = current.filter(
          (entry) =>
            !(entry.class_id === item.id && entry.profile_id === student.id)
        );

        return allowed === null
          ? without
          : [
              ...without,
              {
                class_id: item.id,
                profile_id: student.id,
                allowed
              }
            ];
      });
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "No pudimos cambiar el permiso."
      );
    } finally {
      setSavingClassId(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="admin-modal access-modal student-access-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-access-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>×</button>

        <div className="access-modal-heading">
          <div>
            <span>Permisos de alumna</span>
            <h2 id="student-access-title">
              {student.full_name || student.email}
            </h2>
            <p>
              Grupo: <strong>{student.group_name ?? "Sin grupo"}</strong>
              {!student.active && " · Alumna suspendida"}
            </p>
          </div>

          <div className="access-summary">
            <strong>{effectiveCount}</strong>
            <span>clases reproducibles ahora</span>
          </div>
        </div>

        {status && <p className="admin-status" role="status">{status}</p>}

        <div className="access-section-title student-access-search">
          <div>
            <h3>Clases</h3>
            <p>La excepción individual prevalece sobre el grupo.</p>
          </div>
          {classes.length >= 6 && (
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar clase…"
              aria-label="Buscar clase"
            />
          )}
        </div>

        {loading ? (
          <p className="empty-admin">Cargando permisos…</p>
        ) : (
          <div className="student-class-access-list">
            {filteredClasses.map((item, index) => {
              const decision = resolveConfiguredClassAccess(
                item,
                student,
                assignments,
                overrides
              );
              const override = overrides.find(
                (entry) =>
                  entry.class_id === item.id
                  && entry.profile_id === student.id
              );

              return (
                <div className="student-class-access-row" key={item.id}>
                  <div className="access-class-name">
                    <span>Clase {String(classes.length - index).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.published ? "Publicada" : "Pausada"} · {item.category}
                    </small>
                  </div>

                  <div className="access-effective">
                    <span
                      className={
                        decision.allowed
                          ? "access-state allowed"
                          : "access-state denied"
                      }
                    >
                      {decision.allowed ? "Permitida" : "Sin acceso"}
                    </span>
                    <small>{decision.label}</small>
                  </div>

                  <div className="access-choice">
                    <button
                      type="button"
                      className={!override ? "selected" : ""}
                      disabled={savingClassId !== null}
                      onClick={() => void changeOverride(item, null)}
                    >
                      Heredar
                    </button>
                    <button
                      type="button"
                      className={override?.allowed === true ? "selected allow" : ""}
                      disabled={savingClassId !== null}
                      onClick={() => void changeOverride(item, true)}
                    >
                      Permitir
                    </button>
                    <button
                      type="button"
                      className={override?.allowed === false ? "selected deny" : ""}
                      disabled={savingClassId !== null}
                      onClick={() => void changeOverride(item, false)}
                    >
                      Bloquear
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredClasses.length === 0 && (
              <p className="empty-admin">No encontramos clases.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
