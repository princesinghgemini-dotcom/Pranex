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
});

test("quote and cart routes explain which commerce actions are not connected", () => {
  assert.match(quotePage, /does not send or save your information/i);
  assert.match(quotePage, /Submission unavailable in preview/);
  assert.match(quotePage, /Supplier matching, secure submission, quote tracking and notifications require backend integration/i);
  assert.match(cartPage, /Cart persistence, stock checks, shipping estimates and checkout are not connected yet/i);
});
