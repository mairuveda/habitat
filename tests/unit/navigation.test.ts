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

test("admin navigation has real pages", () => {
  for (const route of adminRoutes) assert.equal(existsSync(route), true, `${route} should exist`);

  const source = readFileSync("src/components/admin/AdminApp.tsx", "utf8");
  assert.doesNotMatch(source, /href=["']#["']/);
  assert.match(source, /\/admin\/alumnas/);
  assert.match(source, /\/admin\/grupos/);
  assert.match(source, /\/admin\/clases/);
  assert.match(source, /\/admin\/ajustes/);
});

test("student navigation exposes only implemented pages", () => {
  for (const route of studentRoutes) assert.equal(existsSync(route), true, `${route} should exist`);

  const source = readFileSync("src/components/student/StudentApp.tsx", "utf8");
  assert.doesNotMatch(source, /href=["']#["']/);
  assert.match(source, /\/alumnos\/dashboard/);
  assert.match(source, /\/alumnos\/clases/);
  assert.doesNotMatch(source, /Favoritos|Mi progreso|Mensajes/);
});
