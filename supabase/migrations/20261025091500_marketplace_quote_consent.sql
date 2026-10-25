-- Record explicit contact consent for marketplace quote enquiries.
alter table public.marketplace_quote_requests
  add column if not exists contact_consent boolean not null default false,
  add column if not exists consent_at timestamptz;

drop function if exists public.submit_marketplace_quote(uuid,text,text,text,text,integer,text,text,text);

create or replace function public.submit_marketplace_quote(
  p_request_key uuid,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_product_request text,
  p_quantity integer,
  p_unit text,
  p_contact_consent boolean,
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
    or p_contact_consent is distinct from true
    or (p_contact_email is not null and (length(p_contact_email)>254 or p_contact_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'))
    or (p_delivery_location is not null and length(p_delivery_location)>160)
    or (p_notes is not null and length(p_notes)>1000) then
    raise exception 'Invalid quote request fields or missing contact consent' using errcode = '22023';
  end if;

  v_phone_hash := encode(extensions.digest(trim(p_contact_phone), 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_phone_hash, 0));

  select q.id into v_id from public.marketplace_quote_requests q where q.request_key = p_request_key;
  if found then return v_id; end if;

  if (select count(*) from public.marketplace_quote_requests q
      where q.contact_phone_hash = v_phone_hash
        and q.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Quote request limit reached for this phone number. Please try again later.' using errcode = 'P0001';
  end if;

  insert into public.marketplace_quote_requests
    (request_key,contact_name,contact_phone,contact_phone_hash,contact_email,product_request,quantity,unit,
     contact_consent,consent_at,delivery_location,notes)
  values
    (p_request_key,trim(p_contact_name),trim(p_contact_phone),v_phone_hash,
     nullif(trim(coalesce(p_contact_email,'')),''),trim(p_product_request),p_quantity,p_unit,
     true,now(),nullif(trim(coalesce(p_delivery_location,'')),''),nullif(trim(coalesce(p_notes,'')),''))
  returning id into v_id;

  return v_id;
end;
$quote$;

revoke all on function public.submit_marketplace_quote(uuid,text,text,text,text,integer,text,text,boolean,text,text) from public;
grant execute on function public.submit_marketplace_quote(uuid,text,text,text,text,integer,text,text,boolean,text,text) to anon, authenticated;
