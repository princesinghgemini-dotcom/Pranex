-- Public buyer quote intake with constrained fields, rate limits, and no public read access.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
alter extension pgcrypto set schema extensions;
create table if not exists public.marketplace_quote_requests (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  contact_name text not null check (length(trim(contact_name)) between 2 and 100),
  contact_phone text not null check (contact_phone ~ '^[6-9][0-9]{9}$'),
  contact_phone_hash text not null,
  contact_email text check (contact_email is null or length(contact_email) <= 254),
  product_request text not null check (length(trim(product_request)) between 2 and 200),
  quantity integer not null check (quantity between 1 and 10000000),
  unit text not null check (unit in ('packs','units','cartons','kg','litres')),
  delivery_location text check (delivery_location is null or length(delivery_location) <= 160),
  notes text check (notes is null or length(notes) <= 1000),
  status text not null default 'new' check (status in ('new','triaged','quoted','closed','spam')),
  created_at timestamptz not null default now()
);

create index if not exists marketplace_quote_requests_created_idx
  on public.marketplace_quote_requests (created_at desc);
create index if not exists marketplace_quote_requests_phone_created_idx
  on public.marketplace_quote_requests (contact_phone_hash, created_at desc);

alter table public.marketplace_quote_requests enable row level security;
revoke all on public.marketplace_quote_requests from public, anon, authenticated;
grant select, insert, update, delete on public.marketplace_quote_requests to service_role;

create or replace function public.submit_marketplace_quote(
  p_request_key uuid,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_product_request text,
  p_quantity integer,
  p_unit text,
  p_delivery_location text default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $quote$
declare
  v_id uuid;
  v_phone_hash text;
begin
  if p_request_key is null then raise exception 'Request key is required' using errcode = '22023'; end if;
  if length(trim(coalesce(p_contact_name,''))) not between 2 and 100
    or p_contact_phone !~ '^[6-9][0-9]{9}$'
    or length(trim(coalesce(p_product_request,''))) not between 2 and 200
    or p_quantity is null or p_quantity not between 1 and 10000000
    or p_unit not in ('packs','units','cartons','kg','litres')
    or (p_contact_email is not null and (length(p_contact_email)>254 or p_contact_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'))
    or (p_delivery_location is not null and length(p_delivery_location)>160)
    or (p_notes is not null and length(p_notes)>1000) then
    raise exception 'Invalid quote request fields' using errcode = '22023';
  end if;

  v_phone_hash := encode(extensions.digest(trim(p_contact_phone), 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_phone_hash, 0));

  select q.id into v_id from public.marketplace_quote_requests q
    where q.request_key = p_request_key;
  if found then return v_id; end if;

  if (select count(*) from public.marketplace_quote_requests q
      where q.contact_phone_hash = v_phone_hash
        and q.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Quote request limit reached for this phone number. Please try again later.'
      using errcode = 'P0001';
  end if;

  insert into public.marketplace_quote_requests
    (request_key,contact_name,contact_phone,contact_phone_hash,contact_email,product_request,quantity,unit,delivery_location,notes)
  values
    (p_request_key,trim(p_contact_name),trim(p_contact_phone),v_phone_hash,
     nullif(trim(coalesce(p_contact_email,'')),''),trim(p_product_request),p_quantity,p_unit,
     nullif(trim(coalesce(p_delivery_location,'')),''),nullif(trim(coalesce(p_notes,'')),''))
  returning id into v_id;

  return v_id;
end;
$quote$;

revoke all on function public.submit_marketplace_quote(uuid,text,text,text,text,integer,text,text,text) from public;
grant execute on function public.submit_marketplace_quote(uuid,text,text,text,text,integer,text,text,text) to anon, authenticated;
