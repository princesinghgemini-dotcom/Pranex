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
revoke update, delete, truncate, references, trigger on public.inventory_batches from anon, authenticated;
grant select on public.organizations, public.organization_members, public.inventory_batches, public.inventory_movements to authenticated;
grant insert (organization_id, sku, product_name, batch_code, expires_on, received_at, created_by)
  on public.inventory_batches to authenticated;

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
as $
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

  if p_idempotency_key is not null and exists (
    select 1 from public.inventory_movements
    where organization_id = p_organization_id and idempotency_key = p_idempotency_key
  ) then
    select b.id into v_batch_id from public.inventory_batches b
    join public.inventory_movements m on m.organization_id=b.organization_id and m.batch_id=b.id
    where m.organization_id=p_organization_id and m.idempotency_key=p_idempotency_key limit 1;
    return v_batch_id;
  end if;

  insert into public.inventory_batches
    (organization_id, sku, product_name, batch_code, expires_on, created_by)
  values (p_organization_id, trim(p_sku), trim(p_product_name), trim(p_batch_code), p_expires_on, v_uid)
  on conflict (organization_id, sku, batch_code)
  do update set product_name = excluded.product_name, expires_on = excluded.expires_on
  returning id into v_batch_id;

  insert into public.inventory_movements
    (organization_id, batch_id, movement_type, quantity_delta, reference, idempotency_key, created_by)
  values (p_organization_id, v_batch_id, 'receipt', p_quantity, p_reference, p_idempotency_key, v_uid);

  return v_batch_id;
end;
$$;

revoke all on function public.record_inventory_receipt(uuid,text,text,text,integer,date,text,text) from public, anon;
grant execute on function public.record_inventory_receipt(uuid,text,text,text,integer,date,text,text) to authenticated;
