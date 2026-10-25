import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/admin/configuration/page.tsx", import.meta.url), "utf8");
const admin = await readFile(new URL("../app/[workspace]/page.tsx", import.meta.url), "utf8");

test("admin configuration exposes core marketplace and operational policy areas", () => {
  for (const text of ["Marketplace identity", "Seller & catalogue governance", "Commerce & fulfilment", "Inventory policy", "platformFeePercent", "lowStockThreshold", "shippingProvider"]) {
    assert.ok(page.includes(text), `missing admin setting: ${text}`);
  }
});

test("admin configuration clearly marks draft-only state and avoids claiming persistence", () => {
  assert.match(page, /PREVIEW · NOT PERSISTED/);
  assert.match(page, /do not change live marketplace behaviour yet/i);
  assert.match(page, /Save draft locally/);
});

test("admin workspace links to configuration centre", () => {
  assert.match(admin, /\/admin\/configuration/);
});
