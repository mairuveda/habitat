import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("browser no longer depends on PUBLIC build variables", () => {
  const files = [
    "src/lib/runtime-config.ts",
    "src/lib/supabase.ts",
    "src/components/auth/LoginForm.tsx",
    "src/components/admin/CloudinaryUpload.tsx",
    "src/components/admin/AdminSettings.tsx"
  ];

  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /import\.meta\.env|PUBLIC_/);
  }
});

test("server config endpoint never exposes secrets", () => {
  const worker = readFileSync("worker/index.ts", "utf8");
  const runtime = readFileSync("worker/runtime-services.ts", "utf8");

  assert.match(worker, /\/api\/config/);
  assert.match(worker, /publicRuntimeConfig/);
  assert.doesNotMatch(runtime.match(/publicRuntimeConfig[\s\S]*?return \{[\s\S]*?\n\}/)?.[0] ?? "", /SECRET/);
});

test("canonical env example has no duplicated public aliases", () => {
  const env = readFileSync(".env.example", "utf8");

  assert.doesNotMatch(env, /PUBLIC_/);
  assert.match(env, /SUPABASE_URL=/);
  assert.match(env, /SUPABASE_PUBLISHABLE_KEY=/);
  assert.match(env, /SUPABASE_SECRET_KEY=/);
  assert.match(env, /CLOUDINARY_API_SECRET=/);
});
