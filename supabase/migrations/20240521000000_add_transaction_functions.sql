-- Create transaction management functions
create or replace function begin_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Start a new transaction
  perform pg_advisory_xact_lock(1);
end;
$$;

create or replace function commit_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Nothing needed here as the transaction will automatically commit
  null;
end;
$$;

create or replace function rollback_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Rollback the current transaction
  rollback;
end;
$$;