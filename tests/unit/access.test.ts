import assert from "node:assert/strict";
import test from "node:test";
import {
  canConsumeClass,
  resolveConfiguredClassAccess
} from "../../src/lib/admin/access.ts";
import type { AdminStudent } from "../../src/lib/admin/students.ts";
import type {
  AdminPilatesClass,
  ClassGroupAssignment,
  ClassStudentOverride
} from "../../src/lib/classes.ts";

const baseClass: AdminPilatesClass = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Clase",
  description: "",
  duration: 20,
  level: "Todos",
  category: "Viajes",
  image: "",
  published: true,
  created_at: new Date().toISOString(),
  access_scope: "selected"
};

const student: AdminStudent = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "student@example.com",
  full_name: "Student",
  active: true,
  group_id: "00000000-0000-4000-8000-000000000003",
  group_name: "Viajeras"
};

const assignment: ClassGroupAssignment = {
  class_id: baseClass.id,
  group_id: student.group_id!
};

test("group access is inherited when there is no individual override", () => {
  const decision = resolveConfiguredClassAccess(
    baseClass,
    student,
    [assignment],
    []
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.source, "group");
  assert.match(decision.label, /Viajeras/);
});

test("individual deny overrides inherited group access", () => {
  const overrides: ClassStudentOverride[] = [{
    class_id: baseClass.id,
    profile_id: student.id,
    allowed: false
  }];

  const decision = resolveConfiguredClassAccess(
    baseClass,
    student,
    [assignment],
    overrides
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.source, "individual-deny");
  assert.equal(canConsumeClass(baseClass, student, [assignment], overrides), false);
});

test("individual allow can grant access when base scope is none", () => {
  const item = { ...baseClass, access_scope: "none" as const };
  const overrides: ClassStudentOverride[] = [{
    class_id: item.id,
    profile_id: student.id,
    allowed: true
  }];

  const decision = resolveConfiguredClassAccess(item, student, [], overrides);

  assert.equal(decision.allowed, true);
  assert.equal(decision.source, "individual-allow");
});

test("paused class and suspended student cannot consume even with permission", () => {
  assert.equal(
    canConsumeClass(
      { ...baseClass, published: false },
      student,
      [assignment],
      []
    ),
    false
  );

  assert.equal(
    canConsumeClass(
      baseClass,
      { ...student, active: false },
      [assignment],
      []
    ),
    false
  );
});
