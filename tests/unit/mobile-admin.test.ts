import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin mobile keeps navigation available through an explicit drawer", () => {
  const app = readFileSync("src/components/admin/AdminApp.tsx", "utf8");
  const css = readFileSync("src/styles/admin-pages.css", "utf8");

  assert.match(app, /mobileMenuOpen/);
  assert.match(app, /admin-mobile-menu-button/);
  assert.match(app, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(app, /aria-controls="admin-navigation"/);
  assert.match(app, /admin-mobile-scrim/);
  assert.match(app, /setMobileMenuOpen\(false\)/);

  assert.match(css, /ADMIN MOBILE V2/);
  assert.match(css, /\.admin-shell aside\.mobile-open nav\s*\{\s*display:\s*grid;/);
  assert.match(css, /\.admin-mobile-menu-button/);
  assert.match(css, /\.admin-mobile-scrim/);
  assert.match(css, /\.admin-shell nav a[\s\S]*min-height:\s*44px/);
});

test("admin mobile stacks dense management controls", () => {
  const css = readFileSync("src/styles/admin-pages.css", "utf8");

  assert.match(
    css,
    /\.class-management-actions[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
  );
  assert.match(
    css,
    /\.access-student-row,[\s\S]*\.student-class-access-row[\s\S]*grid-template-columns:\s*1fr/
  );
  assert.match(
    css,
    /\.admin-modal,[\s\S]*max-height:\s*calc\(100dvh - 8px\)/
  );
  assert.match(
    css,
    /@media \(max-width: 380px\)[\s\S]*\.stats,[\s\S]*grid-template-columns:\s*1fr/
  );
});
