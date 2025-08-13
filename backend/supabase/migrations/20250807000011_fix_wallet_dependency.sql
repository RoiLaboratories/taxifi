-- Drop existing tables
drop table if exists public.transactions cascade;
drop table if exists public.drive_and_save cascade;
drop table if exists public.drive_and_save_wallets cascade;
drop table if exists public.rides cascade;
drop table if exists public.wallets cascade;
drop table if exists public.users cascade;

-- Recreate tables in correct order
-- Create wallets table first (refers to auth.users)
create table if not exists public.wallets (
    id uuid default uuid_generate_v4(),
    user_id uuid not null,
    account_number text unique,
    balance decimal(10,2) default 0,
    is_admin boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint wallets_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Create users table (refers to auth.users and wallets.account_number)
create table if not exists public.users (
    id uuid not null,
    email text unique not null,
    phone_number text unique not null,
    full_name text not null,
    role text check (role in ('driver', 'rider')) not null,
    bvn text,
    wallet_id text unique not null,
    status text check (status in ('active', 'inactive', 'pending')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade,
    constraint users_wallet_id_fkey foreign key (wallet_id) references public.wallets (account_number) on delete restrict
);

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

-- Create drive_and_save_wallets table
create table if not exists public.drive_and_save_wallets (
    id uuid default uuid_generate_v4(),
    driver_id uuid not null,
    balance decimal(10,2) default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint drive_and_save_wallets_driver_id_fkey foreign key (driver_id) references public.users (id) on delete cascade,
    constraint one_wallet_per_driver unique (driver_id)
);

-- Create drive_and_save table
create table if not exists public.drive_and_save (
    id uuid default uuid_generate_v4(),
    driver_id uuid not null,
    wallet_id uuid not null,
    save_percentage integer check (save_percentage between 1 and 100),
    duration_days integer check (duration_days in (7, 30, 365)),
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null,
    status text check (status in ('active', 'completed', 'broken')),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint drive_and_save_driver_id_fkey foreign key (driver_id) references public.users (id) on delete cascade,
    constraint drive_and_save_wallet_id_fkey foreign key (wallet_id) references public.drive_and_save_wallets (id) on delete restrict
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

-- Regrant permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
