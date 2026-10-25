-- Test-only fixture matching the existing Pranex production tenant schema.
-- Run after the isolated FEFO prototype tests and before the product-batch ledger migration.
create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','purchaser','accountant','approver','catalog_manager','dispatch','finance','support','compliance_reviewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid,
  manufacturer_org_id uuid not null references public.organizations(id) on delete restrict,
  batch_number text not null,
  expires_on date not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0,
  warehouse_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  org_id uuid references public.organizations(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);
