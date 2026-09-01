import assert from "node:assert/strict";
import test from "node:test";
import { runtimeServices } from "../../worker/runtime-services.ts";

const configuredRuntime = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "publishable",
  SUPABASE_SECRET_KEY: "secret",
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_UPLOAD_PRESET: "habitat_private",
  CLOUDINARY_API_SECRET: "cloudinary-secret"
};

test("runtime health reports configured auth, admin and video services", () => {
  assert.deepEqual(runtimeServices(configuredRuntime), {
    auth: true,
    admin: true,
    video: true
  });
});

test("runtime video health requires Cloudinary API secret", () => {
  const { CLOUDINARY_API_SECRET: _, ...withoutSecret } = configuredRuntime;

  assert.equal(runtimeServices(withoutSecret).video, false);
});

test("runtime video health does not depend on browser API key", () => {
  assert.equal(runtimeServices(configuredRuntime).video, true);
});

test("runtime admin health requires a server-side admin key", () => {
  const { SUPABASE_SECRET_KEY: _, ...withoutAdminKey } = configuredRuntime;

  assert.equal(runtimeServices(withoutAdminKey).admin, false);
  assert.equal(runtimeServices(withoutAdminKey).auth, true);
});

test("runtime auth health requires a Supabase publishable key", () => {
  const { SUPABASE_PUBLISHABLE_KEY: _, ...withoutPublishableKey } = configuredRuntime;

  assert.equal(runtimeServices(withoutPublishableKey).auth, false);
  assert.equal(runtimeServices(withoutPublishableKey).admin, false);
});
