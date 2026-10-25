import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/shiprocket.ts", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

test("Shiprocket integration keeps credentials and bearer tokens server-side", () => {
  assert.match(source, /import "server-only"/);
  assert.match(source, /process\.env\.SHIPROCKET_EMAIL/);
  assert.match(source, /process\.env\.SHIPROCKET_PASSWORD/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SHIPROCKET/);
});

test("Shiprocket client validates AWB, Indian postcodes, and package weight", () => {
  assert.match(source, /Invalid AWB format/);
  assert.match(source, /six digits/);
  assert.match(source, /weightKg <= 0/);
  assert.match(source, /courier\/track\/awb/);
  assert.match(source, /courier\/serviceability/);
});

test("Shiprocket documentation warns that live order actions need credentials and verification", () => {
  assert.match(readme, /Shiprocket/);
  assert.match(readme, /SHIPROCKET_EMAIL/);
  assert.match(readme, /SHIPROCKET_PASSWORD/);
  assert.match(readme, /have not been enabled/i);
});
