-- Drop all existing policies
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Allow function-based user creation" on public.users;
drop policy if exists "Allow wallet creation during signup" on public.wallets;
drop policy if exists "Wallets are viewable by owner" on public.wallets;
drop policy if exists "Users can view wallet transactions" on public.transactions;
drop policy if exists "Rides are viewable by participants" on public.rides;
drop policy if exists "Riders can request rides" on public.rides;
drop policy if exists "Drivers can accept rides" on public.rides;
drop policy if exists "User management" on public.users;
drop policy if exists "Wallet management" on public.wallets;
drop policy if exists "Transaction access" on public.transactions;
drop policy if exists "Ride access" on public.rides;
drop policy if exists "Rider ride creation" on public.rides;
drop policy if exists "Driver ride updates" on public.rides;

-- Enable RLS on tables
alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.rides enable row level security;
alter table public.transactions enable row level security;

-- Essential policies for authentication and signup flow

-- 1. Users table policy - Allow access for authentication
create policy "users_policy"
  on public.users
  for all
  using (
    -- Service role can do anything
    auth.role() = 'service_role'
    OR
    -- Users can access their own data
    auth.uid() = id
    OR
    -- Allow anonymous access for login
    auth.role() = 'anon'
  );

-- 2. Wallets table policy - Only service role can manage wallets during signup
create policy "wallets_policy"
  on public.wallets
  for all
  using (
    -- Service role can do anything
    auth.role() = 'service_role'
    OR
    -- Users can access their own wallet
    auth.uid() = user_id
  );

-- Basic permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
