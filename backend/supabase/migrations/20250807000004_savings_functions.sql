-- Function to activate or update drive and save plan
create or replace function activate_drive_and_save_plan(
  driver_id_input uuid,
  save_percentage_input integer,
  duration_days_input integer
)
returns uuid
language plpgsql
security definer
as $$
declare
  savings_wallet_id uuid;
  new_plan_id uuid;
  active_plan record;
begin
  -- Verify input parameters
  if save_percentage_input not between 1 and 100 then
    raise exception 'Save percentage must be between 1 and 100';
  end if;
  
  if duration_days_input not in (7, 30, 365) then
    raise exception 'Duration must be 7, 30, or 365 days';
  end if;

  -- Verify this is a driver
  if not exists (
    select 1 from public.users
    where id = driver_id_input
    and role = 'driver'
    and status = 'active'
  ) then
    raise exception 'User is not an active driver';
  end if;

  -- Get or create savings wallet
  select id into savings_wallet_id
  from public.drive_and_save_wallets
  where driver_id = driver_id_input;

  if not found then
    insert into public.drive_and_save_wallets (driver_id, balance)
    values (driver_id_input, 0)
    returning id into savings_wallet_id;
  end if;

  -- Check for existing active plan
  select * into active_plan
  from public.drive_and_save
  where driver_id = driver_id_input
  and status = 'active';

  if found then
    raise exception 'Driver already has an active savings plan';
  end if;

  -- Create new savings plan
  insert into public.drive_and_save (
    driver_id,
    wallet_id,
    save_percentage,
    duration_days,
    start_date,
    end_date,
    status
  )
  values (
    driver_id_input,
    savings_wallet_id,
    save_percentage_input,
    duration_days_input,
    now(),
    now() + (duration_days_input || ' days')::interval,
    'active'
  )
  returning id into new_plan_id;

  return new_plan_id;
end;
$$;

-- Function to check if a savings plan is complete
create or replace function check_savings_plan_completion()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Mark plans as completed if they've reached their end date
  update public.drive_and_save
  set status = 'completed'
  where status = 'active'
  and end_date <= now();
  
  return null;
end;
$$;

-- Create trigger to automatically check plan completion
drop trigger if exists check_savings_completion on public.drive_and_save;

create trigger check_savings_completion
  after update of balance on public.drive_and_save_wallets
  for each statement
  execute function check_savings_plan_completion();

-- Function to get driver's saving status
create or replace function get_driver_savings_status(driver_id_input uuid)
returns table (
  wallet_id uuid,
  wallet_balance decimal(10,2),
  plan_id uuid,
  save_percentage integer,
  duration_days integer,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  status text,
  can_create_new_plan boolean
)
language plpgsql
security definer
as $$
begin
  return query
  with current_plan as (
    select 
      w.id as wallet_id,
      w.balance as wallet_balance,
      s.id as plan_id,
      s.save_percentage,
      s.duration_days,
      s.start_date,
      s.end_date,
      s.status
    from public.drive_and_save_wallets w
    left join public.drive_and_save s on s.wallet_id = w.id
    where w.driver_id = driver_id_input
    and (s.status = 'active' or s.status is null)
  )
  select 
    p.wallet_id,
    p.wallet_balance,
    p.plan_id,
    p.save_percentage,
    p.duration_days,
    p.start_date,
    p.end_date,
    p.status,
    case 
      when p.status is null then true
      when p.status != 'active' then true
      else false
    end as can_create_new_plan
  from current_plan p;
end;
$$;
