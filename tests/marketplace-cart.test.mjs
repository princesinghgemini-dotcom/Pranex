import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const grid = await readFile(new URL("../app/marketplace/ProductGrid.tsx", import.meta.url), "utf8");
const cart = await readFile(new URL("../app/marketplace/cart/page.tsx", import.meta.url), "utf8");
const badge = await readFile(new URL("../app/marketplace/CartCount.tsx", import.meta.url), "utf8");

test("buyer cart is explicitly browser-local and does not claim order creation", () => {
  assert.match(grid, /pranex-buyer-cart-v1/);
  assert.match(cart, /window\.localStorage/);
  assert.match(cart, /No inventory is reserved, and no order or payment is created/);
  assert.doesNotMatch(cart, /fetch\(["']\/api\/orders/);
});

test("product cards add items and increment existing quantities", () => {
  assert.match(grid, /function addToCart/);
  assert.match(grid, /quantity: line\.quantity \+ 1/);
  assert.match(grid, /Add to cart/);
  assert.match(grid, /pranex-cart-updated/);
});

test("cart quantities are bounded and removal and clear actions exist", () => {
  assert.match(cart, /value > 9999/);
  assert.match(cart, /function remove/);
  assert.match(cart, /function clear/);
  assert.ok(cart.includes('type="number" min={1} max={9999}'));
});

test("cart badge reacts to same-tab and cross-tab changes", () => {
  assert.match(badge, /addEventListener\("storage"/);
  assert.match(badge, /addEventListener\("pranex-cart-updated"/);
  assert.match(badge, /removeEventListener/);
});

test("quote flow is offered without treating cart as checkout", () => {
  assert.match(cart, /href="\/marketplace\/quotes"/);
  assert.match(cart, /Request supplier quote/);
  assert.doesNotMatch(cart, /Pay now|Place order|Checkout now/);
});
