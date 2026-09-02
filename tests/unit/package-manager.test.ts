import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

type PackageJson = {
  packageManager?: string;
  scripts?: Record<string, string>;
};

test("pnpm is the only package manager used by lifecycle scripts", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;

  assert.match(pkg.packageManager ?? "", /^pnpm@/);
  assert.equal(existsSync("package-lock.json"), false);

  for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
    assert.doesNotMatch(
      command,
      /(^|\s)(npm|npx)(\s|$)/,
      `${name} must not invoke npm or npx`
    );
  }
});

test("preview and deploy build through pnpm", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;

  assert.match(pkg.scripts?.preview ?? "", /^pnpm run build && wrangler dev /);
  assert.equal(pkg.scripts?.deploy, "pnpm run build && wrangler deploy");
  assert.match(pkg.scripts?.["preview:share"] ?? "", /^pnpm run build && wrangler dev /);
});
