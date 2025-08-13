-- Drop existing tables and constraints
drop table if exists public.transactions cascade;
drop table if exists public.drive_and_save cascade;
drop table if exists public.drive_and_save_wallets cascade;
drop table if exists public.rides cascade;
drop table if exists public.wallets cascade;
drop table if exists public.users cascade;

-- Create users table with nullable wallet_id
create table if not exists public.users (
    id uuid not null,
    email text unique not null,
    phone_number text unique not null,
    full_name text not null,
    role text check (role in ('driver', 'rider')) not null,
    password text,
    bvn text,
    wallet_id text, -- Initially nullable
    status text check (status in ('active', 'inactive', 'pending')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

-- Create wallets table
create table if not exists public.wallets (
    id uuid default uuid_generate_v4(),
    user_id uuid not null,
    account_number text unique not null,
    balance decimal(10,2) default 0,
    is_admin boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint wallets_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Create or replace the create_new_user function
create or replace function create_new_user(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_phone_number text,
  user_role text,
  user_password text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_number text;
  new_user json;
begin
  -- First create the user record without wallet_id
  insert into public.users (
    id,
    email,
    full_name,
    phone_number,
    role,
    password,
    status
  ) values (
    user_id,
    user_email,
    user_full_name,
    user_phone_number,
    user_role,
    user_password,
    'active'
  );

  -- Generate wallet account number (10 digits)
  wallet_number := to_char(floor(random() * 9000000000 + 1000000000), 'FM9999999999');
  
  -- Create wallet
  insert into public.wallets (
    user_id,
    account_number,
    balance
  ) values (
    user_id,
    wallet_number,
    0
  );

  -- Update user with wallet_id
  update public.users
  set wallet_id = wallet_number
  where id = user_id
  returning to_json(users.*) into new_user;

  return new_user;
end;
$$;

-- Grant execute permission
grant execute on function create_new_user(uuid, text, text, text, text, text) to authenticated;
grant execute on function create_new_user(uuid, text, text, text, text, text) to anon;

-- Create other tables
-- Create rides table
create table if not exists public.rides (
    id uuid default uuid_generate_v4(),
    rider_id uuid not null,
    driver_id uuid,
    pickup_location jsonb not null,
    destination_location jsonb not null,
    status text check (status in ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
    fare decimal(10,2),
    distance decimal(10,2),
    duration integer,
    commission_amount decimal(10,2),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint rides_rider_id_fkey foreign key (rider_id) references public.users (id) on delete restrict,
    constraint rides_driver_id_fkey foreign key (driver_id) references public.users (id) on delete restrict
);

-- Create transactions table
create table if not exists public.transactions (
    id uuid default uuid_generate_v4(),
    from_account text,
    to_account text,
    amount decimal(10,2) not null check (amount > 0),
    type text check (type in ('ride_payment', 'commission', 'withdrawal', 'deposit', 'savings', 'savings_withdrawal', 'breaking_fee', 'bonus')),
    status text check (status in ('pending', 'completed', 'failed')),
    ride_id uuid,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint transactions_from_account_fkey foreign key (from_account) references public.wallets (account_number) on delete restrict,
    constraint transactions_to_account_fkey foreign key (to_account) references public.wallets (account_number) on delete restrict,
    constraint transactions_ride_id_fkey foreign key (ride_id) references public.rides (id) on delete restrict
);

-- After all tables are created, add the wallet_id reference
alter table public.users
    add constraint users_wallet_id_fkey foreign key (wallet_id) references public.wallets (account_number) on delete restrict;

-- Now we can add not-null constraint
alter table public.users
    alter column wallet_id set not null;
