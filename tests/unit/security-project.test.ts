import assert from "node:assert/strict";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import { join } from "node:path";
import test from "node:test";

function filesUnder(root: string): string[] {
  if (!existsSync(root)) return [];

  const result: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      result.push(...filesUnder(path));
      continue;
    }

    if (/\.(ts|tsx|astro|sql|jsonc?)$/.test(path)) result.push(path);
  }

  return result;
}

function source(files: string[]): string {
  return files
    .map((file) => `\n/* ${file} */\n${readFileSync(file, "utf8")}`)
    .join("\n");
}

const applicationFiles = [
  ...filesUnder("src"),
  ...filesUnder("worker"),
  ...filesUnder("supabase/migrations")
];

const browserSource = source(filesUnder("src"));
const workerSource = source(filesUnder("worker"));
const databaseSource = source(filesUnder("supabase/migrations"));

test("A01 access control is enforced at UI, Worker and database boundaries", () => {
  assert.match(workerSource, /async function requireAuthenticated/);
  assert.match(workerSource, /async function requireAdmin/);
  assert.match(workerSource, /authClient\.auth\.getUser\(token\)/);
  assert.match(workerSource, /profile\?\.role !== "admin"/);

  for (const table of ["profiles", "groups", "group_members", "classes", "class_groups", "class_student_access"]) {
    assert.match(
      databaseSource,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      `${table} must have RLS enabled`
    );
  }

  assert.match(databaseSource, /student reads assigned published classes/i);
  assert.match(databaseSource, /published = true/i);
  assert.match(databaseSource, /gm\.profile_id = auth\.uid\(\)/i);
  assert.match(databaseSource, /class_student_access/i);
  assert.match(databaseSource, /allowed = true/i);
  assert.match(databaseSource, /admin manages class overrides/i);
});

test("A02 security configuration is centralized and protects every Worker response", () => {
  assert.doesNotMatch(browserSource, /PUBLIC_SUPABASE|PUBLIC_CLOUDINARY|import\.meta\.env/);
  assert.doesNotMatch(browserSource, /SUPABASE_SECRET_KEY|CLOUDINARY_API_SECRET/);

  assert.match(workerSource, /publicRuntimeConfig/);
  assert.match(workerSource, /secureResponse\(response, request, env\)/);
  assert.match(workerSource, /env\.ASSETS\.fetch\(request\)/);
  assert.match(workerSource, /Content-Security-Policy/);
  assert.match(workerSource, /X-Content-Type-Options/);
  assert.match(workerSource, /Strict-Transport-Security/);
  assert.match(workerSource, /frame-ancestors 'none'/);
});

test("A03 supply chain has a locked package manager, lockfile, audit and Dependabot", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    packageManager?: string;
    scripts?: Record<string, string>;
  };

  assert.match(pkg.packageManager ?? "", /^pnpm@/);
  assert.equal(existsSync("pnpm-lock.yaml"), true);
  assert.equal(existsSync("package-lock.json"), false);
  assert.equal(existsSync(".github/dependabot.yml"), true);
  assert.match(pkg.scripts?.["security:audit"] ?? "", /pnpm audit/);
});

test("A04 secrets and session material stay out of browser-persistent config", () => {
  assert.doesNotMatch(browserSource, /sb_secret_/);
  assert.doesNotMatch(browserSource, /CLOUDINARY_API_SECRET/);
  assert.doesNotMatch(browserSource, /\blocalStorage\b/);
  assert.match(browserSource, /window\.sessionStorage/);
  assert.match(workerSource, /crypto\.subtle\.digest\("SHA-256"/);
});

test("A05 injection/XSS primitives are absent and mutable JSON is bounded", () => {
  const all = source(applicationFiles);

  assert.doesNotMatch(all, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(all, /\.innerHTML\s*=/);
  assert.doesNotMatch(all, /\beval\s*\(/);
  assert.doesNotMatch(all, /\bnew\s+Function\s*\(/);

  assert.match(workerSource, /MAX_JSON_BYTES = 32 \* 1024/);
  assert.match(workerSource, /application\/json/);
  assert.match(workerSource, /allowedKeys = new Set/);
});

test("A06 class publication and deletion fail safe", () => {
  const classes = readFileSync("src/lib/classes.ts", "utf8");

  assert.match(classes, /published: false/);
  assert.match(classes, /videoDeliveryType !== "authenticated"/);
  assert.match(workerSource, /\.update\(\{ published: false \}\)/);
  assert.match(workerSource, /destroyCloudinaryVideo/);
});

test("A07 portal shells validate once while sensitive APIs revalidate credentials", () => {
  const admin = readFileSync("src/components/admin/AdminApp.tsx", "utf8");
  const student = readFileSync("src/components/student/StudentApp.tsx", "utf8");
  const protectedProfile = readFileSync("src/components/auth/useProtectedProfile.ts", "utf8");

  assert.match(admin, /window\.history\.pushState/);
  assert.match(student, /event\.preventDefault\(\)/);
  assert.match(student, /onClick=\{navigateToClasses\}/);
  assert.match(protectedProfile, /getCurrentProfile\(\)/);

  assert.match(workerSource, /authClient\.auth\.getUser\(token\)/);
  assert.match(workerSource, /requireAdmin/);
  assert.match(workerSource, /async function adminPlayback/);
  assert.match(workerSource, /adminClassPlaybackMatch/);
});

test("A08 uploads and destructive operations preserve integrity boundaries", () => {
  assert.match(workerSource, /upload_preset/);
  assert.match(workerSource, /folder !== "habitat\/classes"/);
  assert.match(workerSource, /sha256Hex/);
  assert.match(workerSource, /cloudinaryDestroySucceeded/);
});

test("A09 security events and Cloudflare observability are enabled", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");

  assert.match(workerSource, /type: "security"/);
  assert.match(workerSource, /securityEvent\(/);
  assert.match(wrangler, /"observability"\s*:\s*\{\s*"enabled"\s*:\s*true/s);
});

test("A10 exceptional conditions fail closed", () => {
  assert.match(workerSource, /unhandled-exception/);
  assert.match(workerSource, /status: 400 \| 413 \| 415/);
  assert.match(workerSource, /No autorizado\./);
  assert.match(workerSource, /Origen no permitido\./);
});

test("legacy unauthenticated student shell cannot be accidentally reused", () => {
  assert.equal(existsSync("src/components/student/StudentShell.astro"), false);
});

test("secrets and local media remain excluded from version control", () => {
  const gitignore = readFileSync(".gitignore", "utf8");

  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^\*\.mp4$/m);
  assert.match(gitignore, /^\*\.mov$/m);
  assert.match(gitignore, /^\*\.webm$/m);
});
