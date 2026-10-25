import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261025000100_inventory_ledger_fefo.sql", import.meta.url), "utf8");

test("inventory tables are tenant-scoped and RLS protected", () => {
  for (const table of ["organizations", "organization_members", "inventory_batches", "inventory_movements"]) {
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security", "i"));
  }
  assert.match(migration, /organization_id uuid not null references public\.organizations/i);
  assert.match(migration, /foreign key \(organization_id, batch_id\)/i);
});

test("inventory movement history cannot be updated or deleted by client roles", () => {
  assert.match(migration, /revoke insert, update, delete, truncate, references, trigger on public\.inventory_movements from anon, authenticated/i);
  assert.match(migration, /create policy inventory_movements_read_member/i);
});

test("receipt RPC uses a narrow privileged boundary and authenticates tenant membership", () => {
  assert.match(migration, /function public\.record_inventory_receipt/i);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /v_uid uuid := auth\.uid\(\)/i);
  assert.match(migration, /m\.role in \('owner','admin','inventory_manager'\)/i);
  assert.match(migration, /revoke all on function public\.record_inventory_receipt[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute on function public\.record_inventory_receipt[\s\S]*to authenticated/i);
});

test("receipt quantity and expiry are validated", () => {
  assert.match(migration, /p_quantity <= 0 or p_quantity > 100000000/i);
  assert.match(migration, /p_expires_on < current_date/i);
});

test("batch balance derives from append-only movement deltas", () => {
  assert.match(migration, /create or replace view public\.inventory_batch_balances\s+with \(security_invoker = true\)/i);
  assert.match(migration, /coalesce\(sum\(m\.quantity_delta\), 0\)::bigint as on_hand/i);
});

test("receipt and allocation idempotency are serialized and parameter-bound", () => {
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_organization_id::text \|\| ':' \|\| p_idempotency_key, 0\)\)/i);
  assert.match(migration, /Idempotency key reused with different receipt parameters/i);
  assert.match(migration, /inventory_allocation_requests/i);
  assert.match(migration, /Idempotency key reused with different allocation parameters/i);
});

test("FEFO allocation locks batches, excludes expired lots, and refuses insufficient stock", () => {
  assert.match(migration, /function public\.allocate_inventory_fefo/i);
  assert.match(migration, /security definer\s+set search_path = ''[\s\S]*?as \$\$/i);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_organization_id::text \|\| ':' \|\| lower\(trim\(p_sku\)\), 0\)\)/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /b\.expires_on is null or b\.expires_on >= current_date/i);
  assert.match(migration, /Insufficient non-expired stock/i);
  assert.match(migration, /grant execute on function public\.allocate_inventory_fefo[\s\S]*to authenticated/i);
});

test("batch writes are only available through the validated RPC", () => {
  assert.match(migration, /No direct client INSERT grant on inventory_batches/i);
  assert.doesNotMatch(migration, /grant insert \(organization_id, sku, product_name, batch_code, expires_on, received_at, created_by\)\s+on public\.inventory_batches to authenticated/i);
});
