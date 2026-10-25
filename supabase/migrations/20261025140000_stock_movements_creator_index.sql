-- Cover the creator foreign key for stock movement rows.
create index if not exists stock_movements_created_by_idx
  on public.stock_movements (created_by);
