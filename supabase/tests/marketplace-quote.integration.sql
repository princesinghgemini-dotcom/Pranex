begin;

do $$
declare
  k1 uuid := gen_random_uuid();
  v1 uuid;
  v2 uuid;
  v_count integer;
begin
  v1 := public.submit_marketplace_quote(k1, 'Pranex Buyer', '9876543210', null,
    'Mineral mixture', 5, 'packs', true, 'Patna, Bihar', 'Integration test');
  v2 := public.submit_marketplace_quote(k1, 'Pranex Buyer', '9876543210', null,
    'Mineral mixture', 5, 'packs', true, 'Patna, Bihar', 'Integration test');
  if v1 is distinct from v2 then
    raise exception 'Idempotent quote submission returned different IDs';
  end if;

  perform public.submit_marketplace_quote(gen_random_uuid(), 'Pranex Buyer', '9876543210', null,
    'Mineral mixture', 6, 'packs', true, null, null);
  perform public.submit_marketplace_quote(gen_random_uuid(), 'Pranex Buyer', '9876543210', null,
    'Mineral mixture', 7, 'packs', true, null, null);

  select count(*) into v_count from public.marketplace_quote_requests
    where contact_phone = '9876543210';
  if v_count <> 3 then raise exception 'Expected exactly 3 test requests, got %', v_count; end if;

  begin
    perform public.submit_marketplace_quote(gen_random_uuid(), 'Pranex Buyer', '9876543210', null,
      'Mineral mixture', 8, 'packs', true, null, null);
    raise exception 'Rate limit failed to reject fourth request';
  exception when sqlstate 'P0001' then
    if sqlerrm not like 'Quote request limit reached%' then raise; end if;
  end;

  begin
    perform public.submit_marketplace_quote(gen_random_uuid(), 'Pranex Buyer', '1234567890', null,
      'Mineral mixture', 8, 'packs', true, null, null);
    raise exception 'Invalid mobile number was accepted';
  exception when sqlstate '22023' then
    if sqlerrm <> 'Invalid quote request fields or missing contact consent' then raise; end if;
  end;
end;
$$;

do $$
begin
  begin
    perform public.submit_marketplace_quote(gen_random_uuid(), 'Pranex Buyer', '9876543211', null,
      'Mineral mixture', 8, 'packs', false, null, null);
    raise exception 'Missing consent was accepted';
  exception when sqlstate '22023' then
    if sqlerrm <> 'Invalid quote request fields or missing contact consent' then raise; end if;
  end;
end;
$$;

rollback;
