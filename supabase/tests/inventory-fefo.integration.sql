-- Runs against a disposable PostgreSQL database after the migration is applied.
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.organizations(id,name) values ('22222222-2222-4222-8222-222222222222','Pranex CI Tenant') on conflict do nothing;
insert into public.organization_members(organization_id,user_id,role)
values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','owner')
on conflict do nothing;

select public.record_inventory_receipt(
 '22222222-2222-4222-8222-222222222222','CI-SKU','CI test item','BATCH-A',10,
 current_date + 10,'ci-receipt-a','ci-receipt-key-a');
select public.record_inventory_receipt(
 '22222222-2222-4222-8222-222222222222','CI-SKU','CI test item','BATCH-B',10,
 current_date + 20,'ci-receipt-b','ci-receipt-key-b');
select public.record_inventory_receipt(
 '22222222-2222-4222-8222-222222222222','CI-SKU','CI test item','BATCH-A',10,
 current_date + 10,'ci-receipt-a','ci-receipt-key-a');

do $$
declare
  v_result jsonb;
  v_retry jsonb;
  v_count integer;
  v_failed boolean := false;
begin
  select count(*) into v_count from public.inventory_movements
    where organization_id='22222222-2222-4222-8222-222222222222'
      and idempotency_key='ci-receipt-key-a';
  if v_count <> 1 then raise exception 'Receipt retry created duplicate movement rows'; end if;

  v_result := public.allocate_inventory_fefo(
    '22222222-2222-4222-8222-222222222222','CI-SKU',12,'ci-order-1','ci-allocation-key-1');
  if jsonb_array_length(v_result) <> 2 then raise exception 'FEFO should allocate from two batches'; end if;
  if v_result->0->>'batch_code' <> 'BATCH-A' or (v_result->0->>'quantity')::integer <> 10 then
    raise exception 'FEFO did not consume earliest-expiring batch first: %', v_result;
  end if;
  if v_result->1->>'batch_code' <> 'BATCH-B' or (v_result->1->>'quantity')::integer <> 2 then
    raise exception 'FEFO remainder was allocated incorrectly: %', v_result;
  end if;

  v_retry := public.allocate_inventory_fefo(
    '22222222-2222-4222-8222-222222222222','CI-SKU',12,'ci-order-1','ci-allocation-key-1');
  if v_retry is distinct from v_result then raise exception 'Allocation retry result changed'; end if;

  select count(*) into v_count from public.inventory_movements
    where organization_id='22222222-2222-4222-8222-222222222222'
      and idempotency_key like 'ci-allocation-key-1:%';
  if v_count <> 2 then raise exception 'Allocation retry duplicated movement rows'; end if;

  begin
    perform public.allocate_inventory_fefo(
      '22222222-2222-4222-8222-222222222222','CI-SKU',99,'ci-order-short','ci-allocation-short');
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'Insufficient stock was not rejected'; end if;
end $$;
rollback;
