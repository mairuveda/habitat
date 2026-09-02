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

test("student portal stays inside one authenticated shell", () => {
  for (const route of studentRoutes) assert.equal(existsSync(route), true, `${route} should exist`);

  const source = readFileSync("src/components/student/StudentApp.tsx", "utf8");
  const login = readFileSync("src/components/auth/LoginForm.tsx", "utf8");
  const protectedProfile = readFileSync("src/components/auth/useProtectedProfile.ts", "utf8");

  assert.match(source, /const CLASSES_PATH = "\/alumnos\/clases"/);
  assert.match(source, /replaceState\(\{\}, "", CLASSES_PATH\)/);
  assert.match(source, /function navigateToClasses/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /onClick=\{navigateToClasses\}/);
  assert.doesNotMatch(source, />Inicio<\/a>/);
  assert.match(login, /"\/alumnos\/clases"/);
  assert.match(protectedProfile, /"\/alumnos\/clases"/);
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

test("student class cards are concise and progressive controls avoid redundant UI", () => {
  const library = readFileSync("src/components/student/ClassLibrary.tsx", "utf8");

  assert.match(library, /className="class-cover"/);
  assert.match(library, /className="class-number"/);
  assert.match(library, /className="class-description"/);
  assert.match(library, /className="class-meta"/);
  assert.match(library, /Ver clase →/);

  assert.doesNotMatch(library, /Todas tus clases|Clases recientes|Clases disponibles para vos/);
  assert.doesNotMatch(library, /<h3>{item\.title}<\/h3>/);
  assert.doesNotMatch(library, /<img src={item\.image}/);

  assert.match(library, /const showSearch = items\.length >= 6/);
  assert.match(library, /const showDurationFilter = durationBuckets\.short && durationBuckets\.long/);
  assert.match(library, /const showLevelFilter = levels\.length > 1/);
  assert.match(library, /const showCategoryFilter = categories\.length > 1/);
});

test("admin classes expose preview and access management without weakening student playback", () => {
  const ui = readFileSync("src/components/admin/AdminClasses.tsx", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const migration = readFileSync("supabase/migrations/0005_class_access.sql", "utf8");

  assert.match(ui, /Ver video/);
  assert.match(ui, /Accesos/);
  assert.match(ui, /AdminClassPreviewDialog/);
  assert.match(ui, /AdminClassAccessDialog/);

  assert.match(worker, /async function adminPlayback/);
  assert.match(worker, /const context = await requireAdmin\(request, env\)/);
  assert.match(worker, /async function playback/);

  assert.match(migration, /class_student_access/);
  assert.match(migration, /access_scope/);
  assert.match(migration, /allowed = true/);
});
