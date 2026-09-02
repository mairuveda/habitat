import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const adminRoutes = [
  "src/pages/admin/index.astro",
  "src/pages/admin/alumnas.astro",
  "src/pages/admin/grupos.astro",
  "src/pages/admin/clases.astro",
  "src/pages/admin/ajustes.astro"
];

const studentRoutes = [
  "src/pages/alumnos/dashboard.astro",
  "src/pages/alumnos/clases.astro"
];

test("admin navigation has real pages and stays inside the authenticated shell", () => {
  for (const route of adminRoutes) assert.equal(existsSync(route), true, `${route} should exist`);

  const source = readFileSync("src/components/admin/AdminApp.tsx", "utf8");
  assert.doesNotMatch(source, /href=["']#["']/);
  assert.match(source, /\/admin\/alumnas/);
  assert.match(source, /\/admin\/grupos/);
  assert.match(source, /\/admin\/clases/);
  assert.match(source, /\/admin\/ajustes/);
  assert.match(source, /window\.history\.pushState/);
  assert.match(source, /href="\/admin"[\s\S]*className="brand"/);
});

test("dashboard quick actions execute in place instead of navigating", () => {
  const source = readFileSync("src/components/admin/AdminDashboard.tsx", "utf8");

  assert.match(source, /setQuickAction\("group"\)/);
  assert.match(source, /setQuickAction\("student"\)/);
  assert.match(source, /setQuickAction\("class"\)/);
  assert.match(source, /<NewGroupDialog/);
  assert.match(source, /<NewStudentDialog/);
  assert.match(source, /<NewClassDialog/);

  assert.doesNotMatch(source, /className="button secondary" href="\/admin\/grupos"/);
  assert.doesNotMatch(source, /className="button secondary" href="\/admin\/alumnas"/);
  assert.doesNotMatch(source, /className="button" href="\/admin\/clases"/);
  assert.doesNotMatch(source, />Gestionar<\/a>/);
});

test("admin creation dialogs are shared by dashboard and management pages", () => {
  assert.equal(existsSync("src/components/admin/AdminCreateDialogs.tsx"), true);

  const students = readFileSync("src/components/admin/AdminStudents.tsx", "utf8");
  const groups = readFileSync("src/components/admin/AdminGroups.tsx", "utf8");
  const classes = readFileSync("src/components/admin/AdminClasses.tsx", "utf8");

  assert.match(students, /NewStudentDialog/);
  assert.match(groups, /NewGroupDialog/);
  assert.match(classes, /NewClassDialog/);
  assert.doesNotMatch(groups, /href="\/admin\/alumnas"/);
});

test("student navigation exposes only implemented pages and keeps the portal logo internal", () => {
  for (const route of studentRoutes) assert.equal(existsSync(route), true, `${route} should exist`);

  const source = readFileSync("src/components/student/StudentApp.tsx", "utf8");
  assert.doesNotMatch(source, /href=["']#["']/);
  assert.match(source, /\/alumnos\/dashboard/);
  assert.match(source, /\/alumnos\/clases/);
  assert.match(source, /window\.history\.pushState/);
  assert.match(source, /href="\/alumnos\/dashboard"/);
  assert.doesNotMatch(source, /Favoritos|Mi progreso|Mensajes/);
});

test("admin settings are user-facing and keep technical details secondary", () => {
  const source = readFileSync("src/components/admin/AdminSettings.tsx", "utf8");
  assert.match(source, /Mi cuenta/);
  assert.match(source, /Seguridad/);
  assert.match(source, /Actualizar contraseña/);
  assert.match(source, /Estado del sistema/);
  assert.match(source, /Diagnóstico técnico/);
});

test("class deletion is coordinated through the admin Worker", () => {
  const ui = readFileSync("src/components/admin/AdminClasses.tsx", "utf8");
  const classes = readFileSync("src/lib/classes.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");

  assert.match(ui, /Eliminar definitivamente/);
  assert.match(ui, /deleteClassAndVideo/);
  assert.match(classes, /method: "DELETE"/);
  assert.match(classes, /\/api\/admin\/classes\//);
  assert.match(worker, /async function deleteAdminClass/);
  assert.match(worker, /requireAdmin/);
  assert.match(worker, /destroyCloudinaryVideo/);
  assert.match(worker, /\.from\("classes"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("id", classId\)/);
});

test("public navigation uses clear login wording and login exposes a visible home action", () => {
  const header = readFileSync("src/components/Header.astro", "utf8");
  const home = readFileSync("src/pages/index.astro", "utf8");
  const login = readFileSync("src/pages/alumnos/index.astro", "utf8");

  assert.doesNotMatch(header, /Área alumnos/);
  assert.doesNotMatch(home, /Área alumnos/);
  assert.match(header, />Ingresar<\/a>/);
  assert.match(home, />Ingresar<\/a>/);
  assert.match(login, /Volver al inicio/);
  assert.match(login, /btn btn-secondary login-back/);
});
