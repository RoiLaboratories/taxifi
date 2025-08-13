-- Drop existing policies
drop policy if exists "Enable all access for service role" on public.users;
drop policy if exists "Enable read access for users" on public.users;
drop policy if exists "Enable update access for users" on public.users;
drop policy if exists "Enable insert for authenticated users" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Enable users to manage their profile" on public.users;
drop policy if exists "Allow function-based user creation" on public.users;
drop policy if exists "Allow new user creation" on public.users;
drop policy if exists "Allow wallet creation during signup" on public.wallets;
drop policy if exists "Wallets are viewable by owner" on public.wallets;
drop policy if exists "Users can view wallet transactions" on public.transactions;
drop policy if exists "Rides are viewable by participants" on public.rides;
drop policy if exists "Riders can request rides" on public.rides;
drop policy if exists "Drivers can accept rides" on public.rides;
drop policy if exists "Chat messages viewable by participants" on public.chat_messages;
drop policy if exists "Chat participants can send messages" on public.chat_messages;
drop policy if exists "Chat participants can view rooms" on public.chat_rooms;

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.rides enable row level security;
alter table public.drive_and_save enable row level security;
alter table public.drive_and_save_wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

-- Users table policies
create policy "Allow function-based user creation and management"
  on public.users 
  for all
  using (
    -- Allow service role full access
    auth.role() = 'service_role'
    OR
    -- Allow users to manage their own profile
    (auth.role() = 'authenticated' AND auth.uid() = id)
  )
  with check (
    auth.role() = 'service_role'
    OR
    (auth.role() = 'authenticated' AND auth.uid() = id)
  );

-- Wallets table policies
create policy "Allow wallet management"
  on public.wallets
  for all
  using (
    -- Allow service role full access
    auth.role() = 'service_role'
    OR
    -- Allow users to manage their own wallet
    (auth.role() = 'authenticated' AND auth.uid() = user_id)
  )
  with check (
    auth.role() = 'service_role'
    OR
    (auth.role() = 'authenticated' AND auth.uid() = user_id)
  );

-- Transactions table policies
create policy "Users can view wallet transactions"
  on public.transactions 
  for select
  using (
    exists (
      select 1 from public.wallets w
      where (w.account_number = transactions.from_account
         or w.account_number = transactions.to_account)
      and w.user_id = auth.uid()
    )
  );

-- Rides table policies
create policy "Rides are viewable by participants"
  on public.rides 
  for select
  using (auth.uid() = rider_id or auth.uid() = driver_id);

create policy "Riders can request rides"
  on public.rides 
  for insert
  with check (
    auth.uid() = rider_id 
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'rider'
    )
  );

create policy "Drivers can accept rides"
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

-- Drive and save wallet policies
create policy "Drivers can manage their drive and save wallet"
  on public.drive_and_save_wallets
  for all
  using (
    auth.uid() = driver_id
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver'
    )
  )
  with check (
    auth.uid() = driver_id
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver'
    )
  );

-- Drive and save policies
-- View savings plans
create policy "Drivers can view their savings plans"
  on public.drive_and_save
  for select
  using (
    auth.uid() = driver_id
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver'
    )
  );

-- Create new savings plan
create policy "Drivers can create savings plan"
  on public.drive_and_save
  for insert
  with check (
    auth.uid() = driver_id
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver'
    )
    and save_percentage between 1 and 100 
    and duration_days in (7, 30, 365)
  );

-- Complete savings plan
create policy "Drivers can complete savings plan"
  on public.drive_and_save
  for update
  using (
    auth.uid() = driver_id
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver'
    )
    and end_date <= now()
    and status = 'active'
  )
  with check (status = 'completed');

-- Break savings plan
create policy "Drivers can break savings plan"
  on public.drive_and_save
  for update
  using (
    auth.uid() = driver_id
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver'
    )
    and status = 'active'
  )
  with check (status = 'broken');

-- Delete inactive savings plan
create policy "Drivers can delete inactive savings plan"
  on public.drive_and_save
  for delete
  using (
    auth.uid() = driver_id
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver'
    )
    and status != 'active'
  );

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
