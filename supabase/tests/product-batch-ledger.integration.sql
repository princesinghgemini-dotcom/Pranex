-- Integration checks for atomic, idempotent product-batch receipts.
begin;

insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;
insert into public.organizations(id, name)
values ('20000000-0000-4000-8000-000000000001', 'Inventory ledger test')
on conflict (id) do nothing;
insert into public.org_members(org_id, user_id, role, is_active)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', true)
on conflict (org_id, user_id) do update set role = excluded.role, is_active = excluded.is_active;
insert into public.product_batches(id, manufacturer_org_id, batch_number, expires_on, stock_quantity)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'LEDGER-TEST-01', current_date + 90, 5)
on conflict (id) do update set stock_quantity = 5;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
declare
  first_id uuid;
  retry_id uuid;
  balance integer;
  movement_count integer;
begin
  first_id := public.record_product_batch_receipt(
    '30000000-0000-4000-8000-000000000001', 7, 'receipt-test-key-0001', 'PO-TEST-1', 'initial test receipt'
  );
  retry_id := public.record_product_batch_receipt(
    '30000000-0000-4000-8000-000000000001', 7, 'receipt-test-key-0001', 'PO-TEST-1', 'initial test receipt'
  );

  if first_id <> retry_id then
    raise exception 'Idempotent retry returned a different movement ID';
  end if;

  select stock_quantity into balance
  from public.product_batches where id = '30000000-0000-4000-8000-000000000001';
  if balance <> 12 then
    raise exception 'Expected stock balance 12 after one idempotent receipt, got %', balance;
  end if;

  select count(*) into movement_count
  from public.stock_movements
  where organization_id = '20000000-0000-4000-8000-000000000001'
    and idempotency_key = 'receipt-test-key-0001';
  if movement_count <> 1 then
    raise exception 'Expected exactly one movement for idempotency key, got %', movement_count;
  end if;

  begin
    perform public.record_product_batch_receipt(
      '30000000-0000-4000-8000-000000000001', 8, 'receipt-test-key-0001', 'PO-TEST-1', 'initial test receipt'
    );
    raise exception 'Expected mismatched idempotency parameters to be rejected';
  exception when sqlstate '22023' then
    null;
  end;
end;
$$;

rollback;
