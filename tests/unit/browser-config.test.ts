import assert from "node:assert/strict";
import test from "node:test";
import { getVideoUploadConfiguration } from "../../src/lib/browser-config.ts";

test("video upload is configured only with all public Cloudinary variables", () => {
  const result = getVideoUploadConfiguration({
    cloudName: "demo",
    apiKey: "123",
    uploadPreset: "habitat_private"
  });

  assert.equal(result.configured, true);
  assert.deepEqual(result.missing, []);
});

test("missing public API key disables browser video upload", () => {
  const result = getVideoUploadConfiguration({
    cloudName: "demo",
    uploadPreset: "habitat_private"
  });

  assert.equal(result.configured, false);
  assert.deepEqual(result.missing, ["PUBLIC_CLOUDINARY_API_KEY"]);
});

test("reports every missing browser variable explicitly", () => {
  const result = getVideoUploadConfiguration({});

  assert.equal(result.configured, false);
  assert.deepEqual(result.missing, [
    "PUBLIC_CLOUDINARY_CLOUD_NAME",
    "PUBLIC_CLOUDINARY_API_KEY",
    "PUBLIC_CLOUDINARY_UPLOAD_PRESET"
  ]);
});
