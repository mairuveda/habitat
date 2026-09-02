import { useEffect, useMemo, useState } from "react";
import {
  listClassAccessData,
  setClassAccessScope,
  setClassGroupAccess,
  setClassStudentOverride,
  type AdminPilatesClass,
  type ClassAccessScope,
  type ClassGroupAssignment,
  type ClassStudentOverride
} from "@/lib/classes";
import {
  listGroups,
  listStudents,
  type AdminStudent,
  type StudioGroup
} from "@/lib/admin/students";
import {
  canConsumeClass,
  resolveConfiguredClassAccess
} from "@/lib/admin/access";

type Props = {
  item: AdminPilatesClass;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
};

const scopeOptions: Array<{
  value: ClassAccessScope;
  title: string;
  description: string;
}> = [
  {
    value: "all",
    title: "Todas las alumnas",
    description: "Acceso base para toda alumna activa."
  },
  {
    value: "selected",
    title: "Grupos seleccionados",
    description: "El acceso base se hereda desde los grupos marcados."
  },
  {
    value: "none",
    title: "Sólo permisos individuales",
    description: "Nadie accede salvo permisos individuales explícitos."
  }
];

export default function AdminClassAccessDialog({
  item,
  onClose,
  onChanged
}: Props) {
  const [scope, setScope] = useState<ClassAccessScope>(item.access_scope);
  const [groups, setGroups] = useState<StudioGroup[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [assignments, setAssignments] = useState<ClassGroupAssignment[]>([]);
  const [overrides, setOverrides] = useState<ClassStudentOverride[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listGroups(), listStudents(), listClassAccessData()])
      .then(([groupData, studentData, accessData]) => {
        if (cancelled) return;
        setGroups(groupData);
        setStudents(studentData);
        setAssignments(accessData.groupAssignments);
        setOverrides(accessData.overrides);
      })
      .catch(() => {
        if (!cancelled) setStatus("No pudimos cargar los accesos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentItem = useMemo(
    () => ({ ...item, access_scope: scope }),
    [item, scope]
  );

  const activeStudents = useMemo(
    () => students.filter((student) => student.active),
    [students]
  );

  const configuredCount = useMemo(
    () => activeStudents.filter((student) =>
      resolveConfiguredClassAccess(
        currentItem,
        student,
        assignments,
        overrides
      ).allowed
    ).length,
    [activeStudents, assignments, currentItem, overrides]
  );

  const effectiveCount = useMemo(
    () => activeStudents.filter((student) =>
      canConsumeClass(currentItem, student, assignments, overrides)
    ).length,
    [activeStudents, assignments, currentItem, overrides]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;

    return students.filter((student) =>
      `${student.full_name} ${student.email} ${student.group_name ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [search, students]);

  async function changeScope(next: ClassAccessScope) {
    if (next === scope || savingKey) return;

    setSavingKey("scope");
    setStatus(null);

    try {
      await setClassAccessScope(item.id, next);
      setScope(next);
      await onChanged();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "No pudimos cambiar el alcance."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleGroup(groupId: string, enabled: boolean) {
    if (savingKey) return;

    const key = `group:${groupId}`;
    setSavingKey(key);
    setStatus(null);

    try {
      await setClassGroupAccess(item.id, groupId, enabled);

      setAssignments((current) => {
        const without = current.filter(
          (entry) => !(entry.class_id === item.id && entry.group_id === groupId)
        );

        return enabled
          ? [...without, { class_id: item.id, group_id: groupId }]
          : without;
      });

      await onChanged();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "No pudimos cambiar el grupo."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function changeOverride(
    student: AdminStudent,
    allowed: boolean | null
  ) {
    if (savingKey) return;

    const key = `student:${student.id}`;
    setSavingKey(key);
    setStatus(null);

    try {
      await setClassStudentOverride(item.id, student.id, allowed);

      setOverrides((current) => {
        const without = current.filter(
          (entry) => !(entry.class_id === item.id && entry.profile_id === student.id)
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

      await onChanged();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "No pudimos cambiar el permiso individual."
      );
    } finally {
      setSavingKey(null);
    }
  }

  const assignedGroupIds = new Set(
    assignments
      .filter((entry) => entry.class_id === item.id)
      .map((entry) => entry.group_id)
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="admin-modal access-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-access-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>×</button>

        <div className="access-modal-heading">
          <div>
            <span>Accesos de clase</span>
            <h2 id="class-access-title">{item.title}</h2>
          </div>
          <div className="access-summary">
            <strong>{item.published ? effectiveCount : configuredCount}</strong>
            <span>
              {item.published
                ? `de ${activeStudents.length} alumnas pueden verla`
                : `de ${activeStudents.length} tendrán permiso al publicarla`}
            </span>
          </div>
        </div>

        {!item.published && (
          <p className="access-note">
            La clase está pausada. Los permisos quedan configurados, pero ninguna alumna puede reproducirla.
          </p>
        )}

        {status && <p className="admin-status" role="status">{status}</p>}

        <fieldset className="access-scope">
          <legend>Acceso base</legend>
          <div className="scope-grid">
            {scopeOptions.map((option) => (
              <label
                className={scope === option.value ? "scope-option selected" : "scope-option"}
                key={option.value}
              >
                <input
                  type="radio"
                  name="accessScope"
                  value={option.value}
                  checked={scope === option.value}
                  disabled={savingKey !== null}
                  onChange={() => void changeScope(option.value)}
                />
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {scope === "selected" && (
          <section className="access-section">
            <div className="access-section-title">
              <div>
                <h3>Grupos</h3>
                <p>Las alumnas heredan el acceso desde su grupo.</p>
              </div>
            </div>

            <div className="access-group-grid">
              {groups
                .filter((group) => group.active || assignedGroupIds.has(group.id))
                .map((group) => {
                  const members = students.filter(
                    (student) => student.group_id === group.id && student.active
                  );
                  const checked = assignedGroupIds.has(group.id);

                  return (
                    <label
                      className={checked ? "access-group-card selected" : "access-group-card"}
                      key={group.id}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={savingKey !== null}
                        onChange={(event) =>
                          void toggleGroup(group.id, event.target.checked)
                        }
                      />
                      <span>
                        <strong>{group.name}</strong>
                        <small>
                          {members.length === 1
                            ? "1 alumna activa"
                            : `${members.length} alumnas activas`}
                        </small>
                      </span>
                    </label>
                  );
                })}
            </div>
          </section>
        )}

        <section className="access-section individual-access-section">
          <div className="access-section-title">
            <div>
              <h3>Excepciones individuales</h3>
              <p>Permitir o bloquear prevalece sobre el acceso base.</p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar alumna…"
              aria-label="Buscar alumna"
            />
          </div>

          {loading ? (
            <p className="empty-admin">Cargando permisos…</p>
          ) : (
            <div className="access-student-list">
              {filteredStudents.map((student) => {
                const decision = resolveConfiguredClassAccess(
                  currentItem,
                  student,
                  assignments,
                  overrides
                );
                const override = overrides.find(
                  (entry) =>
                    entry.class_id === item.id
                    && entry.profile_id === student.id
                );
                const rowSaving = savingKey === `student:${student.id}`;

                return (
                  <div className="access-student-row" key={student.id}>
                    <div className="access-person">
                      <strong>{student.full_name || "Sin nombre"}</strong>
                      <small>{student.email}</small>
                      <span>{student.group_name ?? "Sin grupo"}</span>
                    </div>

                    <div className="access-effective">
                      <span
                        className={
                          decision.allowed
                            ? "access-state allowed"
                            : "access-state denied"
                        }
                      >
                        {decision.allowed ? "Con acceso" : "Sin acceso"}
                      </span>
                      <small>{decision.label}</small>
                      {!student.active && <small className="access-warning">Suspendida</small>}
                    </div>

                    <div className="access-choice" aria-label={`Permiso de ${student.full_name}`}>
                      <button
                        type="button"
                        className={!override ? "selected" : ""}
                        disabled={rowSaving || savingKey !== null}
                        onClick={() => void changeOverride(student, null)}
                      >
                        Heredar
                      </button>
                      <button
                        type="button"
                        className={override?.allowed === true ? "selected allow" : ""}
                        disabled={rowSaving || savingKey !== null}
                        onClick={() => void changeOverride(student, true)}
                      >
                        Permitir
                      </button>
                      <button
                        type="button"
                        className={override?.allowed === false ? "selected deny" : ""}
                        disabled={rowSaving || savingKey !== null}
                        onClick={() => void changeOverride(student, false)}
                      >
                        Bloquear
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <p className="empty-admin">No encontramos alumnas.</p>
              )}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
