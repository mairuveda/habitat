import assert from "node:assert/strict";
import test from "node:test";
import {
  publicRuntimeConfig,
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

test("runtime exposes one canonical public configuration", () => {
  assert.deepEqual(publicRuntimeConfig(configuredRuntime), {
    supabase: {
      url: "https://example.supabase.co",
      publishableKey: "publishable"
    },
    cloudinary: {
      cloudName: "demo",
      apiKey: "cloudinary-key",
      uploadPreset: "habitat_private"
    }
  });
});

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

test("secrets are required only by server capabilities", () => {
  const { SUPABASE_SECRET_KEY: _, ...withoutAdminSecret } = configuredRuntime;
  const adminReadiness = runtimeReadiness(withoutAdminSecret);

  assert.equal(adminReadiness.services.auth, true);
  assert.equal(adminReadiness.services.admin, false);
  assert.equal(adminReadiness.services.videoUpload, false);
  assert.equal(adminReadiness.services.videoPlayback, true);

  const { CLOUDINARY_API_SECRET: __, ...withoutVideoSecret } = configuredRuntime;
  const videoReadiness = runtimeReadiness(withoutVideoSecret);

  assert.equal(videoReadiness.services.videoUpload, false);
  assert.equal(videoReadiness.services.videoPlayback, false);
  assert.equal(videoReadiness.services.videoDelete, false);
});
