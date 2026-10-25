import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/marketplace/page.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const directory = await readFile(new URL("../app/workspaces/page.tsx", import.meta.url), "utf8");

test("customer marketplace presents the core buying discovery flow", () => {
  for (const text of ["Shop by category", "Popular products", "Request bulk pricing", "Search products and suppliers", "MOQ", "Illustrative catalogue"]) {
    assert.ok(page.includes(text), `missing marketplace experience element: ${text}`);
  }
});

test("marketplace is transparent that catalog data and commerce flows are previews", () => {
  assert.match(page, /demonstration content, not verified offers or live inventory/i);
  assert.match(page, /No payment is taken on this preview page/i);
  assert.match(page, /No live checkout or supplier verification/i);
});

test("marketplace is responsive and accessible at key navigation points", () => {
  assert.match(styles, /\.marketplace/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(page, /aria-label="Main marketplace navigation"/);
  assert.match(page, /aria-label="Shopping cart"/);
  assert.match(directory, /href: "\/marketplace", number: "01", name: "Customer marketplace"/);
});

test("product enquiry controls lead to the quote workflow, not a dead button", () => {
  assert.match(page, /href="\/marketplace\/quotes" aria-label=\{"Enquire about "\+product\.name\}/);
});

const quotePage = await readFile(new URL("../app/marketplace/quotes/page.tsx", import.meta.url), "utf8");
const cartPage = await readFile(new URL("../app/marketplace/cart/page.tsx", import.meta.url), "utf8");

test("marketplace search filters the sample catalogue and preserves the search term", () => {
  assert.match(page, /searchParams: Promise<\{ q\?: string \}>/);
  assert.match(page, /visibleProducts = query \? products\.filter/);
  assert.match(page, /defaultValue=\{params\.q \?\? ""\}/);
  assert.match(page, /No matching sample products found/);
  assert.match(page, /async function getCatalog/);
  assert.match(page, /status", "eq\.approved/);
  assert.match(page, /mode: "unavailable"/);
  assert.match(page, /Demo listings are hidden while live catalogue mode is enabled/);
});

test("quote form is connected to a validated API and explains the non-order boundary", async () => {
  const form = await readFile(new URL("../app/marketplace/quotes/QuoteRequestForm.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/marketplace/quotes/route.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261025090000_marketplace_quote_intake.sql", import.meta.url), "utf8");
  const consentMigration = await readFile(new URL("../supabase/migrations/20261025091500_marketplace_quote_consent.sql", import.meta.url), "utf8");
  assert.match(quotePage, /QuoteRequestForm/);
  assert.match(quotePage, /not an order or a confirmed supplier quote/i);
  assert.match(form, /fetch\("\/api\/marketplace\/quotes"/);
  assert.match(form, /name="phone"/);
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

test("cart remains clearly labelled as a non-transactional preview", () => {
  assert.match(cartPage, /stored in this browser on this device only/i);\n  assert.match(cartPage, /No inventory is reserved, and no order or payment is created/i);\n  assert.match(cartPage, /type="number" min={1} max={9999}/);\n  assert.match(cartPage, /Clear cart/);\n  assert.match(cartPage, /Request supplier quote/);
});
