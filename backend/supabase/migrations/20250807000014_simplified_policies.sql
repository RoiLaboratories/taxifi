-- Drop existing policies
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

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.rides enable row level security;
alter table public.transactions enable row level security;

-- Users table policies
create policy "User management"
  on public.users
  for all -- This allows all operations (select, insert, update, delete)
  using (
    -- Service role can do anything
    auth.role() = 'service_role'
    OR
    -- Users can manage their own profile
    auth.uid() = id
    OR
    -- Allow select for login checks
    current_setting('role') = 'anon'
  );

-- Wallets table policies
create policy "Wallet management"
  on public.wallets
  for all
  using (
    -- Service role can do anything
    auth.role() = 'service_role'
    OR
    -- Users can only access their own wallet
    auth.uid() = user_id
  );

-- Transactions table policies
create policy "Transaction access"
  on public.transactions
  for all
  using (
    -- Service role can do anything
    auth.role() = 'service_role'
    OR
    -- Users can only see transactions involving their wallet
    exists (
      select 1 from public.wallets w
      where (w.account_number = transactions.from_account
         or w.account_number = transactions.to_account)
      and w.user_id = auth.uid()
    )
  );

-- Rides table policies
create policy "Ride access"
  on public.rides
  for select
  using (auth.uid() = rider_id or auth.uid() = driver_id);

create policy "Rider ride creation"
  on public.rides
  for insert
  with check (
    auth.uid() = rider_id 
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'rider'
    )
  );

create policy "Driver ride updates"
  on public.rides
  for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'driver'
    )
  )
  with check (
    driver_id = auth.uid() 
    or (driver_id is null and status = 'requested')
  );

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on all tables in schema public to anon; -- Allow anon to read for login checks
