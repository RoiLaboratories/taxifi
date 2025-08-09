-- Helper functions
create or replace function generate_wallet_id(phone text)
returns text
language sql
security definer
as $$
  select 'WAL' || replace(phone, '0', '234');
$$;

create or replace function generate_verification_code()
returns text
language plpgsql
security definer
as $$
declare
  chars text[] := array['0','1','2','3','4','5','6','7','8','9'];
  result text := '';
  i integer := 0;
begin
  for i in 1..6 loop
    result := result || chars[1 + floor(random() * 10)];
  end loop;
  return result;
end;
$$;

-- User management functions
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verification_code text;
begin
  -- Generate verification code
  verification_code := generate_verification_code();
  
  -- Create user profile
  insert into public.users (
    id,
    email,
    full_name,
    phone_number,
    role,
    bvn,
    wallet_id,
    status,
    verification_code,
    verification_code_expires_at,
    email_verified
  )
  values (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'bvn',
    generate_wallet_id(NEW.raw_user_meta_data->>'phone_number'),
    'pending',
    verification_code,
    now() + interval '15 minutes',
    false
  );

  -- Create wallet for user
  insert into public.wallets (
    user_id,
    account_number,
    balance,
    is_admin
  )
  values (
    NEW.id,
    generate_wallet_id(NEW.raw_user_meta_data->>'phone_number'),
    0,
    false
  );

  -- If user is a driver, create their savings wallet
  if NEW.raw_user_meta_data->>'role' = 'driver' then
    insert into public.drive_and_save_wallets (
      driver_id,
      balance
    )
    values (
      NEW.id,
      0
    );
  end if;
  
  return NEW;
end;
$$;

-- Email verification functions
create or replace function resend_verification_code(user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  new_code text;
  user_email text;
begin
  -- Generate new code
  new_code := generate_verification_code();
  
  -- Update user's verification code
  update public.users
  set 
    verification_code = new_code,
    verification_code_expires_at = now() + interval '15 minutes'
  where id = user_id
  and not email_verified
  returning email into user_email;
  
  if found then
    -- Edge function will handle email sending
    return new_code;
  else
    return null;
  end if;
end;
$$;

create or replace function verify_email(user_id uuid, code text)
returns boolean
language plpgsql
security definer
as $$
declare
  user_record record;
begin
  -- Get user record
  select * into user_record
  from public.users
  where id = user_id
  and verification_code = code
  and verification_code_expires_at > now()
  and not email_verified;

  if found then
    -- Update user as verified
    update public.users
    set 
      email_verified = true,
      verification_code = null,
      verification_code_expires_at = null,
      status = case 
        when role = 'driver' then 'pending' -- Drivers need additional verification
        else 'active' -- Riders are active immediately after email verification
      end
    where id = user_id;
    return true;
  else
    return false;
  end if;
end;
$$;

-- Transaction handling functions
create or replace function update_wallet_balance()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'UPDATE' and NEW.status = 'completed' and OLD.status = 'pending' then
    -- Deduct from sender
    update public.wallets
    set balance = balance - NEW.amount
    where account_number = NEW.from_account;
    
    -- Add to receiver
    update public.wallets
    set balance = balance + NEW.amount
    where account_number = NEW.to_account;
  end if;
  return NEW;
end;
$$;

-- Savings handling functions
create or replace function handle_drive_and_save()
returns trigger
language plpgsql
security definer
as $$
declare
  driver_saving record;
  saving_amount decimal(10,2);
begin
  -- Only process when ride is completed
  if TG_OP = 'UPDATE' and NEW.status = 'completed' and OLD.status != 'completed' then
    -- Check if driver has an active Drive & Save plan
    select das.*, w.account_number into driver_saving
    from public.drive_and_save das
    join public.wallets w on w.user_id = das.driver_id
    where das.driver_id = NEW.driver_id
    and das.status = 'active'
    and now() between das.start_date and das.end_date
    limit 1;

    if found then
      -- Calculate saving amount from the fare (after commission)
      saving_amount := (NEW.fare - NEW.commission_amount) * (driver_saving.save_percentage / 100.0);

      -- Add to savings wallet
      update public.drive_and_save_wallets
      set balance = balance + saving_amount
      where id = driver_saving.wallet_id;

      -- Record the savings transaction
      insert into public.transactions (
        from_account,
        to_account,
        amount,
        type,
        status,
        ride_id
      )
      values (
        driver_saving.account_number,
        driver_saving.account_number,
        saving_amount,
        'savings',
        'completed',
        NEW.id
      );
    end if;
  end if;
  return NEW;
end;
$$;

create or replace function handle_savings_withdrawal()
returns trigger
language plpgsql
security definer
as $$
declare
  driver_wallet record;
  admin_wallet record;
  breaking_fee decimal(10,2);
  withdrawal_amount decimal(10,2);
  is_early_withdrawal boolean;
  saving_plan record;
begin
  if TG_OP = 'UPDATE' then
    -- Only handle withdrawals (when balance decreases)
    if OLD.balance <= NEW.balance then
      return NEW;
    end if;

    withdrawal_amount := OLD.balance - NEW.balance;

    -- Get the saving plan details
    select * into saving_plan
    from public.drive_and_save
    where wallet_id = NEW.id and status = 'active'
    limit 1;

    if found then
      -- Check if this is an early withdrawal
      is_early_withdrawal := now() < saving_plan.end_date;

      -- Get the driver's main wallet
      select w.* into driver_wallet
      from public.wallets w
      where w.user_id = NEW.driver_id
      limit 1;

      -- Get admin wallet for breaking fee
      select * into admin_wallet
      from public.wallets
      where is_admin = true
      limit 1;

      if is_early_withdrawal then
        breaking_fee := withdrawal_amount * 0.05; -- 5% breaking fee
        
        -- Create breaking fee transaction
        insert into public.transactions (
          from_account,
          to_account,
          amount,
          type,
          status
        ) values (
          driver_wallet.account_number,
          admin_wallet.account_number,
          breaking_fee,
          'breaking_fee',
          'completed'
        );
      end if;

      -- Create withdrawal transaction
      insert into public.transactions (
        from_account,
        to_account,
        amount,
        type,
        status
      ) values (
        driver_wallet.account_number,
        driver_wallet.account_number,
        withdrawal_amount,
        'savings_withdrawal',
        'completed'
      );

      -- If this withdraws all savings and it's early, mark plan as broken
      if NEW.balance = 0 and is_early_withdrawal then
        update public.drive_and_save
        set status = 'broken'
        where id = saving_plan.id;
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

-- Chat functions
create or replace function update_chat_last_message()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.chat_rooms
  set 
    last_message = case 
      when NEW.message_type = 'text' then substring(NEW.message from 1 for 50)
      else 'Sent ' || NEW.message_type
    end,
    last_message_time = NEW.created_at
  where ride_id = NEW.ride_id;
  return NEW;
end;
$$;

-- Drop existing triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists wallet_balance_update on public.transactions;
drop trigger if exists ride_auto_save on public.rides;
drop trigger if exists savings_withdrawal_trigger on public.drive_and_save_wallets;
drop trigger if exists chat_last_message_update on public.chat_messages;

-- Create triggers
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create trigger wallet_balance_update
  after update on public.transactions
  for each row execute function update_wallet_balance();

create trigger ride_auto_save
  after update on public.rides
  for each row execute function handle_drive_and_save();

create trigger savings_withdrawal_trigger
  after update on public.drive_and_save_wallets
  for each row execute function handle_savings_withdrawal();

create trigger chat_last_message_update
  after insert on public.chat_messages
  for each row execute function update_chat_last_message();
