import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("workspace directory links to customer, seller, admin, and employee experiences", async () => {
  const page = await read("app/workspaces/page.tsx");
  for (const href of ['href: "/"', 'href: "/seller"', 'href: "/admin"', 'href: "/staff"']) {
    assert.ok(page.includes(href), `missing workspace route ${href}`);
  }
});

test("role portal scaffold explicitly avoids claiming live authorization", async () => {
  const page = await read("app/[workspace]/page.tsx");
  for (const role of ["seller", "admin", "staff"]) assert.ok(page.includes(role));
  assert.match(page, /notFound\(\)/);
  assert.match(page, /no live business records/i);
  assert.match(page, /server-side role checks|role authorization/i);
});

test("home dashboard exposes the workspace directory", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /href="\/workspaces"/);
});
