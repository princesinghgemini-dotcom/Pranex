import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const page = await read("../app/marketplace/page.tsx");
const styles = await read("../app/globals.css");
const directory = await read("../app/workspaces/page.tsx");
const productGrid = await read("../app/marketplace/ProductGrid.tsx");
const quotePage = await read("../app/marketplace/quotes/page.tsx");
const cartPage = await read("../app/marketplace/cart/page.tsx");

test("customer marketplace presents the core buying discovery flow", () => {
  for (const text of ["Shop by category", "Popular products", "Request bulk pricing", "Search products and suppliers", "MOQ", "Illustrative catalogue"]) {
    assert.ok(page.includes(text), `missing marketplace experience element: ${text}`);
  }
});

test("catalogue clearly distinguishes demo data from verified live listings", () => {
  assert.match(page, /Demo listings are hidden while live catalogue mode is enabled|demonstration content, not verified offers or live inventory/i);
  assert.match(page, /mode: "unavailable"/);
  assert.match(page, /async function getCatalog/);
  assert.ok(page.includes('url.searchParams.set("status", "eq.approved")'));
});

test("marketplace navigation and layouts include responsive and accessible affordances", () => {
  assert.match(styles, /\.marketplace/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(page, /aria-label="Shopping cart"/);
  assert.match(directory, /href: "\/marketplace", number: "01", name: "Customer marketplace"/);
});

test("product cards navigate to the quote workflow and support cart actions", () => {
  assert.match(productGrid, /\/marketplace\/quotes/);
  assert.match(productGrid, /add to cart|addToCart/i);
});

test("marketplace search preserves the query and filters visible listings", () => {
  assert.match(page, /searchParams: Promise<\{ q\?: string \}>/);
  assert.match(page, /visibleProducts = query \? products\.filter/);
  assert.match(page, /defaultValue=\{params\.q \?\? ""\}/);
  assert.match(page, /No matching sample products found/);
});

test("quote form is connected to a validated API and enforces contact consent", async () => {
  const form = await read("../app/marketplace/quotes/QuoteRequestForm.tsx");
  const route = await read("../app/api/marketplace/quotes/route.ts");
  const migration = await read("../supabase/migrations/20261025090000_marketplace_quote_intake.sql");
  const consentMigration = await read("../supabase/migrations/20261025091500_marketplace_quote_consent.sql");
  assert.match(quotePage, /QuoteRequestForm/);
  assert.match(quotePage, /not an order or a confirmed supplier quote/i);
  assert.match(form, /fetch\("\/api\/marketplace\/quotes"/);
  assert.match(form, /name="phone"/);
  assert.match(form, /name="consent" required/);
  assert.match(form, /role=\{status.kind === "error" \? "alert" : "status"\}/);
  assert.match(route, /submit_marketplace_quote/);
  assert.match(route, /content-length/);
  assert.match(route, /Cross-origin submission is not allowed/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /Quote request limit reached/i);
  assert.match(migration, /revoke all on public.marketplace_quote_requests from public, anon, authenticated/i);
  assert.match(consentMigration, /p_contact_consent is distinct from true/i);
  assert.match(consentMigration, /consent_at/i);
});

test("cart quantity changes are bounded and cart can be cleared or edited", () => {
  assert.match(cartPage, /type="number" min=\{1\} max=\{9999\}/);
  assert.match(cartPage, /Clear cart/);
  assert.match(cartPage, /onClick=\{\(\) => remove\(item\.id\)\}/);
  assert.match(cartPage, /Request supplier quote/);
});

test("cart accurately explains local persistence and non-transactional scope", () => {
  assert.match(cartPage, /stored in this browser on this device only/i);
  assert.match(cartPage, /No inventory is reserved, and no order or payment is created/i);
  assert.match(cartPage, /checkout and live stock checks are not connected/i);
});
