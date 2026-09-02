import assert from "node:assert/strict";
import test from "node:test";
import {
  isSameOriginRequest,
  readJson,
  secureResponse
} from "../../worker/security.ts";

const env = {
  SUPABASE_URL: "https://example.supabase.co"
};

test("security headers protect HTML and API responses", () => {
  const request = new Request("https://habitat.example/admin");
  const response = secureResponse(new Response("ok"), request, env);

  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=/);
});

test("state-changing requests reject foreign origins", () => {
  assert.equal(
    isSameOriginRequest(new Request("https://habitat.example/api/x", {
      method: "POST",
      headers: { origin: "https://habitat.example" }
    })),
    true
  );

  assert.equal(
    isSameOriginRequest(new Request("https://habitat.example/api/x", {
      method: "POST",
      headers: { origin: "https://evil.example" }
    })),
    false
  );
});

test("JSON reader enforces content type and size", async () => {
  const wrongType = await readJson(new Request("https://habitat.example/api/x", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}"
  }));

  assert.equal(wrongType.ok, false);
  if (!wrongType.ok) assert.equal(wrongType.status, 415);

  const tooLarge = await readJson(new Request("https://habitat.example/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(40_000) })
  }));

  assert.equal(tooLarge.ok, false);
  if (!tooLarge.ok) assert.equal(tooLarge.status, 413);
});
