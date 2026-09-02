import type { AdminStudent } from "./students";
import type {
  AdminPilatesClass,
  ClassGroupAssignment,
  ClassStudentOverride
} from "../classes";

export type AccessDecisionSource =
  | "individual-allow"
  | "individual-deny"
  | "all"
  | "group"
  | "none";

export type AccessDecision = {
  allowed: boolean;
  source: AccessDecisionSource;
  label: string;
};

export function resolveConfiguredClassAccess(
  item: AdminPilatesClass,
  student: AdminStudent,
  assignments: ClassGroupAssignment[],
  overrides: ClassStudentOverride[]
): AccessDecision {
  const override = overrides.find(
    (entry) => entry.class_id === item.id && entry.profile_id === student.id
  );

  if (override) {
    return override.allowed
      ? { allowed: true, source: "individual-allow", label: "Permiso individual" }
      : { allowed: false, source: "individual-deny", label: "Bloqueo individual" };
  }

  if (item.access_scope === "all") {
    return { allowed: true, source: "all", label: "Todas las alumnas" };
  }

  if (
    item.access_scope === "selected"
    && student.group_id
    && assignments.some(
      (entry) => entry.class_id === item.id && entry.group_id === student.group_id
    )
  ) {
    return {
      allowed: true,
      source: "group",
      label: student.group_name ? `Heredado de ${student.group_name}` : "Heredado del grupo"
    };
  }

  return { allowed: false, source: "none", label: "Sin acceso" };
}

export function canConsumeClass(
  item: AdminPilatesClass,
  student: AdminStudent,
  assignments: ClassGroupAssignment[],
  overrides: ClassStudentOverride[]
): boolean {
  if (!item.published || !student.active) return false;

  return resolveConfiguredClassAccess(
    item,
    student,
    assignments,
    overrides
  ).allowed;
}
