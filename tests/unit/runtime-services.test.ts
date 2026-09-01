import assert from "node:assert/strict";
import test from "node:test";
import {
  getCloudinaryApiKey,
  runtimeReadiness
} from "../../worker/runtime-services.ts";

const configuredRuntime = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "publishable",
  SUPABASE_SECRET_KEY: "secret",
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_API_KEY: "cloudinary-key",
  CLOUDINARY_UPLOAD_PRESET: "habitat_private",
  CLOUDINARY_API_SECRET: "cloudinary-secret"
};

test("runtime readiness reports every required capability", () => {
  assert.deepEqual(runtimeReadiness(configuredRuntime), {
    ready: true,
    services: {
      auth: true,
      admin: true,
      videoUpload: true,
      videoPlayback: true,
      videoDelete: true
    },
    missing: []
  });
});

test("missing Supabase admin key explains the upload 503 cause", () => {
  const { SUPABASE_SECRET_KEY: _, ...env } = configuredRuntime;
  const readiness = runtimeReadiness(env);

  assert.equal(readiness.ready, false);
  assert.equal(readiness.services.auth, true);
  assert.equal(readiness.services.admin, false);
  assert.equal(readiness.services.videoUpload, false);
  assert.equal(readiness.services.videoDelete, false);
  assert.equal(readiness.services.videoPlayback, true);
  assert.deepEqual(readiness.missing, [
    "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
  ]);
});

test("missing Cloudinary secret disables every video server capability", () => {
  const { CLOUDINARY_API_SECRET: _, ...env } = configuredRuntime;
  const readiness = runtimeReadiness(env);

  assert.equal(readiness.services.videoUpload, false);
  assert.equal(readiness.services.videoPlayback, false);
  assert.equal(readiness.services.videoDelete, false);
  assert.ok(readiness.missing.includes("CLOUDINARY_API_SECRET"));
});

test("missing Cloudinary API key keeps playback but disables upload and delete", () => {
  const { CLOUDINARY_API_KEY: _, ...env } = configuredRuntime;
  const readiness = runtimeReadiness(env);

  assert.equal(readiness.services.videoPlayback, true);
  assert.equal(readiness.services.videoUpload, false);
  assert.equal(readiness.services.videoDelete, false);
  assert.ok(readiness.missing.includes("CLOUDINARY_API_KEY"));
});

test("missing upload preset disables upload only", () => {
  const { CLOUDINARY_UPLOAD_PRESET: _, ...env } = configuredRuntime;
  const readiness = runtimeReadiness(env);

  assert.equal(readiness.services.videoUpload, false);
  assert.equal(readiness.services.videoPlayback, true);
  assert.equal(readiness.services.videoDelete, true);
  assert.ok(readiness.missing.includes("CLOUDINARY_UPLOAD_PRESET"));
});

test("Cloudinary API key supports explicit runtime and public fallback", () => {
  assert.equal(getCloudinaryApiKey({ CLOUDINARY_API_KEY: "runtime-key" }), "runtime-key");
  assert.equal(getCloudinaryApiKey({ PUBLIC_CLOUDINARY_API_KEY: "public-key" }), "public-key");
  assert.equal(getCloudinaryApiKey({}), null);
});
