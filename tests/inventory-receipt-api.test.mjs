import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/inventory/receipts/route.ts", import.meta.url), "utf8");

test("inventory receipt API requires an authenticated Supabase bearer token", () => {
  assert.match(route, /authorization\.match\(\/\^Bearer/);
  assert.match(route, /\/auth\/v1\/user/);
  assert.match(route, /session is invalid or expired/i);
  assert.match(route, /record_product_batch_receipt/);
});

test("inventory receipt API bounds payloads and validates receipt inputs", () => {
  assert.match(route, /MAX_BODY_BYTES = 4096/);
  assert.match(route, /total > MAX_BODY_BYTES/);
  assert.match(route, /Number\.isSafeInteger\(quantity\)/);
  assert.match(route, /idempotencyKey\.length < 8/);
  assert.match(route, /Cross-origin submission is not allowed/);
});

test("inventory receipt API forwards user identity, never a service-role secret", () => {
  assert.match(route, /Authorization: `Bearer \$\{bearer\}`/);
  assert.match(route, /p_batch_id: batchId/);
  assert.match(route, /p_idempotency_key: idempotencyKey/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("inventory receipt API returns safe permission and retry responses", () => {
  assert.match(route, /status: 403/);
  assert.match(route, /Retry with the same idempotency key/);
  assert.match(route, /Receipt details are invalid or the idempotency key was reused/);
});
