import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("inventory batch listing requires a validated bearer session and forwards user JWT", async () => {
  const route = await read("../app/api/inventory/batches/route.ts");
  assert.match(route, /authorization\.match\(\/\^Bearer/);
  assert.match(route, /\/auth\/v1\/user/);
  assert.match(route, /Authorization: `Bearer \$\{bearer\}`/);
  assert.match(route, /rest\/v1\/product_batches/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("inventory batch listing relies on database RLS rather than a caller-supplied tenant id", async () => {
  const route = await read("../app/api/inventory/batches/route.ts");
  assert.match(route, /select: "id,batch_number,stock_quantity,reserved_quantity,expires_on,warehouse_code,variant_id,manufacturer_org_id"/);
  assert.match(route, /caller.s JWT is forwarded so Postgres RLS remains the tenant boundary/);
  assert.doesNotMatch(route, /searchParams\.set\("manufacturer_org_id"/);
});

test("inventory screen provides sign-in, tenant-scoped live batches, and receipt submission", async () => {
  const page = await read("../app/inventory/page.tsx");
  const component = await read("../app/inventory/InventoryOperations.tsx");
  assert.match(page, /InventoryOperations/);
  assert.match(component, /grant_type=password/);
  assert.match(component, /\/api\/inventory\/batches/);
  assert.match(component, /\/api\/inventory\/receipts/);
  assert.match(component, /crypto\.randomUUID\(\)/);
  assert.match(component, /pendingReceiptKey \|\| crypto\.randomUUID\(\)/);
  assert.match(component, /will reuse the same idempotency key/);
  assert.match(component, /Refresh batches/);
  assert.match(component, /Sign out/);
  assert.match(component, /local storage/i);
  assert.match(component, /database membership and role/);
});
