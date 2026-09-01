import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("preview is local by default and tunnel sharing is explicit", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  const preview = pkg.scripts?.preview ?? "";
  const share = pkg.scripts?.["preview:share"] ?? "";

  assert.match(preview, /wrangler dev/);
  assert.match(preview, /--ip 127\.0\.0\.1/);
  assert.match(preview, /--port 8787/);
  assert.doesNotMatch(preview, /--tunnel/);

  assert.match(share, /wrangler dev/);
  assert.match(share, /--tunnel/);
});

test("Worker separates liveness from readiness", () => {
  const worker = readFileSync("worker/index.ts", "utf8");

  assert.match(worker, /\/api\/health/);
  assert.match(worker, /\/api\/ready/);
  assert.match(worker, /runtimeReadiness/);
  assert.match(worker, /readiness\.ready \? 200 : 503/);
});

test("admin UI consumes readiness even when readiness returns 503", () => {
  const settings = readFileSync("src/components/admin/AdminSettings.tsx", "utf8");
  const dashboard = readFileSync("src/components/admin/AdminDashboard.tsx", "utf8");

  assert.match(settings, /fetch\("\/api\/ready"/);
  assert.match(settings, /missing/);
  assert.match(dashboard, /fetch\("\/api\/ready"/);
  assert.doesNotMatch(dashboard, /if \(!response\.ok\) return/);
});
