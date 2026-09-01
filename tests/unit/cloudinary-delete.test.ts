import assert from "node:assert/strict";
import test from "node:test";
import {
  cloudinaryDestroyParams,
  cloudinaryDestroySucceeded,
  cloudinarySignaturePayload,
  normalizeCloudinaryDeliveryType
} from "../../worker/cloudinary-delete.ts";

test("Cloudinary delete keeps the stored delivery type", () => {
  assert.equal(normalizeCloudinaryDeliveryType("authenticated"), "authenticated");
  assert.equal(normalizeCloudinaryDeliveryType("private"), "private");
  assert.equal(normalizeCloudinaryDeliveryType(null), "upload");
  assert.equal(normalizeCloudinaryDeliveryType("unexpected"), "upload");
});

test("Cloudinary destroy params are signed deterministically", () => {
  const params = cloudinaryDestroyParams(
    "habitat/classes/test-video",
    "authenticated",
    1_700_000_000
  );

  assert.deepEqual(params, {
    public_id: "habitat/classes/test-video",
    timestamp: 1_700_000_000,
    type: "authenticated",
    invalidate: true
  });

  assert.equal(
    cloudinarySignaturePayload(params),
    "invalidate=true&public_id=habitat/classes/test-video&timestamp=1700000000&type=authenticated"
  );
});

test("Cloudinary missing asset is safe for idempotent cleanup", () => {
  assert.equal(cloudinaryDestroySucceeded("ok"), true);
  assert.equal(cloudinaryDestroySucceeded("not found"), true);
  assert.equal(cloudinaryDestroySucceeded("not_found"), true);
  assert.equal(cloudinaryDestroySucceeded("error"), false);
});
