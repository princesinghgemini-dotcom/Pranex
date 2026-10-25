-- Tenant-scoped inventory ledger foundation.
-- This migration defines a minimal self-contained tenant and inventory schema.
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','inventory_manager','catalog_manager','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null check (length(trim(sku)) between 1 and 80),
  product_name text not null check (length(trim(product_name)) between 1 and 200),
  batch_code text not null check (length(trim(batch_code)) between 1 and 100),
  expires_on date,
  received_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, sku, batch_code),
  unique (organization_id, id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null,
  movement_type text not null check (movement_type in ('receipt','adjustment_in','adjustment_out','sale','return','expiry_writeoff')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reference text check (reference is null or length(reference) <= 160),
  idempotency_key text,
  notes text check (notes is null or length(notes) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (organization_id, batch_id)
    references public.inventory_batches(organization_id, id) on delete restrict,
  unique (organization_id, idempotency_key)
);

create index if not exists inventory_batches_tenant_sku_expiry_idx
  on public.inventory_batches (organization_id, sku, expires_on nulls last, received_at);
create index if not exists inventory_movements_tenant_created_idx
  on public.inventory_movements (organization_id, created_at desc);
create index if not exists inventory_movements_batch_idx
  on public.inventory_movements (organization_id, batch_id, created_at);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists organization_members_read_self on public.organization_members;
create policy organization_members_read_self on public.organization_members
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists organizations_read_member on public.organizations;
create policy organizations_read_member on public.organizations
  for select to authenticated using (
    exists (select 1 from public.organization_members m
      where m.organization_id = organizations.id and m.user_id = (select auth.uid()))
  );

drop policy if exists inventory_batches_read_member on public.inventory_batches;
create policy inventory_batches_read_member on public.inventory_batches
  for select to authenticated using (
    exists (select 1 from public.organization_members m
      where m.organization_id = inventory_batches.organization_id and m.user_id = (select auth.uid()))
  );

drop policy if exists inventory_batches_write_manager on public.inventory_batches;
create policy inventory_batches_write_manager on public.inventory_batches
  for insert to authenticated with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.organization_members m
      where m.organization_id = inventory_batches.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner','admin','inventory_manager')
    )
  );

drop policy if exists inventory_movements_read_member on public.inventory_movements;
create policy inventory_movements_read_member on public.inventory_movements
  for select to authenticated using (
    exists (select 1 from public.organization_members m
      where m.organization_id = inventory_movements.organization_id and m.user_id = (select auth.uid()))
  );

-- Ledger rows are append-only for client roles. Mutations must go through
-- narrowly scoped server-side workflows or future validated RPCs.
revoke insert, update, delete, truncate, references, trigger on public.inventory_movements from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.inventory_batches from anon, authenticated;
grant select on public.organizations, public.organization_members, public.inventory_batches, public.inventory_movements to authenticated;
-- No direct client INSERT grant on inventory_batches: all writes pass through the validated receipt RPC.
create or replace view public.inventory_batch_balances
with (security_invoker = true) as
select b.organization_id, b.id as batch_id, b.sku, b.product_name, b.batch_code,
       b.expires_on, b.received_at,
       coalesce(sum(m.quantity_delta), 0)::bigint as on_hand
from public.inventory_batches b
left join public.inventory_movements m
  on m.organization_id = b.organization_id and m.batch_id = b.id
group by b.organization_id, b.id, b.sku, b.product_name, b.batch_code, b.expires_on, b.received_at;

grant select on public.inventory_batch_balances to authenticated;

-- Receipts use a narrowly scoped SECURITY DEFINER RPC because direct client
-- writes to the append-only movement ledger are revoked. The function pins an
-- empty search_path, fully qualifies relations, derives identity from auth.uid(),
-- and verifies manager membership before writing.
create or replace function public.record_inventory_receipt(
  p_organization_id uuid,
  p_sku text,
  p_product_name text,
  p_batch_code text,
  p_quantity integer,
  p_expires_on date default null,
  p_reference text default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $receipt$
declare
  v_batch_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000000 then
    raise exception 'Quantity must be between 1 and 100000000' using errcode = '22023';
  end if;
  if p_expires_on is not null and p_expires_on < current_date then
    raise exception 'Cannot receive an already expired batch' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_sku,''))) not between 1 and 80
    or length(trim(coalesce(p_product_name,''))) not between 1 and 200
    or length(trim(coalesce(p_batch_code,''))) not between 1 and 100 then
    raise exception 'Invalid SKU, product name, or batch code' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = v_uid
      and m.role in ('owner','admin','inventory_manager')
  ) then raise exception 'Inventory manager role required for this organization' using errcode = '42501'; end if;

  if p_idempotency_key is not null then
    if length(p_idempotency_key) > 160 then raise exception 'Idempotency key too long' using errcode = '22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0));
    select b.id into v_batch_id
    from public.inventory_batches b
    join public.inventory_movements m on m.organization_id=b.organization_id and m.batch_id=b.id
    where m.organization_id=p_organization_id and m.idempotency_key=p_idempotency_key
      and m.movement_type='receipt';
    if found then
      if not exists (
        select 1 from public.inventory_batches b
        join public.inventory_movements m on m.organization_id=b.organization_id and m.batch_id=b.id
        where m.organization_id=p_organization_id and m.idempotency_key=p_idempotency_key
          and b.sku=trim(p_sku) and b.batch_code=trim(p_batch_code)
          and b.product_name=trim(p_product_name) and m.reference is not distinct from p_reference
          and m.quantity_delta=p_quantity and b.expires_on is not distinct from p_expires_on
      ) then
        raise exception 'Idempotency key reused with different receipt parameters' using errcode = '22023';
      end if;
      return v_batch_id;
    end if;
  end if;

  insert into public.inventory_batches
    (organization_id, sku, product_name, batch_code, expires_on, created_by)
  values (p_organization_id, trim(p_sku), trim(p_product_name), trim(p_batch_code), p_expires_on, v_uid)
  on conflict (organization_id, sku, batch_code) do nothing
  returning id into v_batch_id;

  if v_batch_id is null then
    select b.id into v_batch_id from public.inventory_batches b
    where b.organization_id=p_organization_id and b.sku=trim(p_sku)
      and b.batch_code=trim(p_batch_code)
      and b.product_name=trim(p_product_name)
      and b.expires_on is not distinct from p_expires_on
    for update;
    if v_batch_id is null then
      raise exception 'Existing batch metadata differs; use a new batch code for changed expiry or product details'
        using errcode = '23514';
    end if;
  end if;

  insert into public.inventory_movements
    (organization_id, batch_id, movement_type, quantity_delta, reference, idempotency_key, created_by)
  values (p_organization_id, v_batch_id, 'receipt', p_quantity, p_reference, p_idempotency_key, v_uid);

  return v_batch_id;
end;
$receipt$;

revoke all on function public.record_inventory_receipt(uuid,text,text,text,integer,date,text,text) from public, anon;
grant execute on function public.record_inventory_receipt(uuid,text,text,text,integer,date,text,text) to authenticated;

-- Request keys are separate because one allocation can span several batches.
create table if not exists public.inventory_allocation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 1 and 160),
  sku text not null check (length(trim(sku)) between 1 and 80),
  requested_quantity integer not null check (requested_quantity > 0),
  reference text check (reference is null or length(reference) <= 160),
  allocations jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);
alter table public.inventory_allocation_requests enable row level security;
drop policy if exists inventory_allocation_requests_read_member on public.inventory_allocation_requests;
create policy inventory_allocation_requests_read_member on public.inventory_allocation_requests
  for select to authenticated using (
    exists (select 1 from public.organization_members m
      where m.organization_id = inventory_allocation_requests.organization_id
        and m.user_id = (select auth.uid()))
  );
revoke all on public.inventory_allocation_requests from public, anon, authenticated;

-- Atomic FEFO allocation: serializes per tenant+SKU, locks eligible batch rows,
-- excludes expired stock, and rolls back if the full requested quantity is unavailable.
create or replace function public.allocate_inventory_fefo(
  p_organization_id uuid,
  p_sku text,
  p_quantity integer,
  p_reference text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
  v_allocations jsonb := '[]'::jsonb;
  v_remaining integer := p_quantity;
  v_take integer;
  v_batch record;
  v_on_hand bigint;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000000 then
    raise exception 'Quantity must be between 1 and 100000000' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_sku,''))) not between 1 and 80 then
    raise exception 'Invalid SKU' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_idempotency_key,''))) not between 1 and 160 then
    raise exception 'A valid idempotency key is required' using errcode = '22023';
  end if;
  if p_reference is not null and length(p_reference) > 160 then
    raise exception 'Reference too long' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id=p_organization_id and m.user_id=v_uid
      and m.role in ('owner','admin','inventory_manager')
  ) then raise exception 'Inventory manager role required for this organization' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || lower(trim(p_sku)), 0));
  select r.allocations into v_result from public.inventory_allocation_requests r
    where r.organization_id=p_organization_id and r.idempotency_key=p_idempotency_key;
  if found then
    if exists (select 1 from public.inventory_allocation_requests r
      where r.organization_id=p_organization_id and r.idempotency_key=p_idempotency_key
        and (r.sku <> trim(p_sku) or r.requested_quantity <> p_quantity or r.reference is distinct from p_reference)) then
      raise exception 'Idempotency key reused with different allocation parameters' using errcode = '22023';
    end if;
    return v_result;
  end if;

  for v_batch in
    select b.id, b.batch_code, b.expires_on, b.received_at
    from public.inventory_batches b
    where b.organization_id=p_organization_id and b.sku=trim(p_sku)
      and (b.expires_on is null or b.expires_on >= current_date)
    order by b.expires_on nulls last, b.received_at, b.id
    for update
  loop
    select coalesce(sum(m.quantity_delta),0)::bigint into v_on_hand
    from public.inventory_movements m
    where m.organization_id=p_organization_id and m.batch_id=v_batch.id;
    if v_on_hand < 0 then raise exception 'Inventory ledger invariant violated' using errcode = '23514'; end if;
    v_take := least(v_remaining::bigint, v_on_hand)::integer;
    if v_take > 0 then
      insert into public.inventory_movements
        (organization_id,batch_id,movement_type,quantity_delta,reference,idempotency_key,created_by)
      values (p_organization_id,v_batch.id,'sale',-v_take,p_reference,
        p_idempotency_key || ':' || v_batch.id::text,v_uid);
      v_allocations := v_allocations || jsonb_build_array(jsonb_build_object(
        'batch_id',v_batch.id,'batch_code',v_batch.batch_code,'quantity',v_take,
        'expires_on',v_batch.expires_on));
      v_remaining := v_remaining - v_take;
    end if;
    exit when v_remaining = 0;
  end loop;

  if v_remaining > 0 then
    raise exception 'Insufficient non-expired stock for SKU %; short by % units', trim(p_sku), v_remaining
      using errcode = '23514';
  end if;

  insert into public.inventory_allocation_requests
    (organization_id,idempotency_key,sku,requested_quantity,reference,allocations,created_by)
  values (p_organization_id,p_idempotency_key,trim(p_sku),p_quantity,p_reference,v_allocations,v_uid);
  return v_allocations;
end;
$$;

revoke all on function public.allocate_inventory_fefo(uuid,text,integer,text,text) from public, anon;
grant execute on function public.allocate_inventory_fefo(uuid,text,integer,text,text) to authenticated;
