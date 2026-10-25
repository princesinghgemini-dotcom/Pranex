-- Append-only inventory movement ledger for the existing Pranex catalogue schema.
-- This migration deliberately reuses product_batches/manufacturer_org_id and org_members;
-- it does not create a parallel organizations or membership model.

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  batch_id uuid not null references public.product_batches(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening_balance', 'receipt', 'adjustment_in', 'adjustment_out', 'sale', 'return', 'expiry_writeoff')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reference text check (reference is null or length(reference) <= 160),
  idempotency_key text,
  notes text check (notes is null or length(notes) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint inventory_movements_idempotency_unique unique (organization_id, idempotency_key)
);

create index if not exists inventory_movements_org_created_idx
  on public.inventory_movements (organization_id, created_at desc);
create index if not exists inventory_movements_batch_created_idx
  on public.inventory_movements (batch_id, created_at desc);

alter table public.inventory_movements enable row level security;

drop policy if exists inventory_movements_read_member on public.inventory_movements;
create policy inventory_movements_read_member on public.inventory_movements
  for select to authenticated using (
    exists (
      select 1 from public.org_members m
      where m.org_id = inventory_movements.organization_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
    )
  );

revoke all on public.inventory_movements from public, anon, authenticated;
grant select on public.inventory_movements to authenticated;

create or replace function public.record_inventory_receipt(
  p_batch_id uuid,
  p_quantity integer,
  p_idempotency_key text,
  p_reference text default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $receipt$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_movement_id uuid;
  v_existing_batch_id uuid;
  v_existing_quantity integer;
  v_existing_reference text;
  v_existing_notes text;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_batch_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 100000000 then
    raise exception 'Batch and a quantity from 1 to 100000000 are required' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) not between 8 and 160 then
    raise exception 'A valid idempotency key is required' using errcode = '22023';
  end if;
  if p_reference is not null and length(p_reference) > 160 then
    raise exception 'Reference is too long' using errcode = '22023';
  end if;
  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'Notes are too long' using errcode = '22023';
  end if;

  select b.manufacturer_org_id into v_org_id
  from public.product_batches b
  where b.id = p_batch_id
  for update;

  if v_org_id is null then
    raise exception 'Inventory batch not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.org_members m
    where m.org_id = v_org_id
      and m.user_id = v_uid
      and m.is_active = true
      and m.role in ('owner', 'admin')
  ) then
    raise exception 'Organization administrator permission required' using errcode = '42501';
  end if;

  select im.id, im.batch_id, im.quantity_delta, im.reference, im.notes
    into v_movement_id, v_existing_batch_id, v_existing_quantity, v_existing_reference, v_existing_notes
  from public.inventory_movements im
  where im.organization_id = v_org_id
    and im.idempotency_key = p_idempotency_key;

  if v_movement_id is not null then
    if v_existing_batch_id <> p_batch_id
      or v_existing_quantity <> p_quantity
      or v_existing_reference is distinct from nullif(trim(p_reference), '')
      or v_existing_notes is distinct from nullif(trim(p_notes), '') then
      raise exception 'Idempotency key reused with different receipt parameters' using errcode = '22023';
    end if;
    return v_movement_id;
  end if;

  insert into public.inventory_movements (
    organization_id, batch_id, movement_type, quantity_delta,
    reference, idempotency_key, notes, created_by
  ) values (
    v_org_id, p_batch_id, 'receipt', p_quantity,
    nullif(trim(p_reference), ''), p_idempotency_key, nullif(trim(p_notes), ''), v_uid
  ) returning id into v_movement_id;

  update public.product_batches
  set stock_quantity = stock_quantity + p_quantity
  where id = p_batch_id
    and manufacturer_org_id = v_org_id;

  if not found then
    raise exception 'Inventory batch changed during receipt' using errcode = '40001';
  end if;

  insert into public.audit_logs (
    actor_user_id, org_id, action, entity_type, entity_id, after_data
  ) values (
    v_uid, v_org_id, 'inventory.receipt.recorded', 'product_batch', p_batch_id::text,
    jsonb_build_object('movement_id', v_movement_id, 'quantity_delta', p_quantity,
      'reference', p_reference, 'idempotency_key', p_idempotency_key)
  );

  return v_movement_id;
end;
$receipt$;

revoke all on function public.record_inventory_receipt(uuid, integer, text, text, text) from public, anon;
grant execute on function public.record_inventory_receipt(uuid, integer, text, text, text) to authenticated;

comment on table public.inventory_movements is
  'Append-only tenant-scoped stock movement ledger. Writes are permitted only through validated security-definer RPCs.';
