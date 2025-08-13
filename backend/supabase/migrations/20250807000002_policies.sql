-- Drop existing policies if any
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

-- Enable Row Level Security on all tables
alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.rides enable row level security;
alter table public.drive_and_save enable row level security;
alter table public.drive_and_save_wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_typing enable row level security;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Wallets are viewable by owner" on public.wallets;
drop policy if exists "Rides are viewable by participants" on public.rides;
drop policy if exists "Riders can request rides" on public.rides;
drop policy if exists "Drivers can accept rides" on public.rides;
drop policy if exists "Chat messages viewable by participants" on public.chat_messages;
drop policy if exists "Drivers can view their drive and save wallet" on public.drive_and_save_wallets;
drop policy if exists "Drivers can withdraw from their drive and save wallet" on public.drive_and_save_wallets;
drop policy if exists "Drivers can view their savings plan" on public.drive_and_save;
drop policy if exists "Drivers can create savings plan" on public.drive_and_save;
drop policy if exists "Drivers can complete savings plan" on public.drive_and_save;
drop policy if exists "Drivers can break savings plan" on public.drive_and_save;
drop policy if exists "Drivers can delete inactive savings plan" on public.drive_and_save;

-- Users table policies
-- Allow function-based user creation and management
create policy "Allow function-based user creation"
  on public.users 
  for all  -- This allows the function to handle the user creation
  using (
    -- Allow users to manage their own profile
    auth.uid() = id
    OR
    -- Allow the function to manage any profile
    auth.role() = 'service_role'
  )
  with check (
    -- Allow users to manage their own profile
    auth.uid() = id
    OR
    -- Allow the function to manage any profile
    auth.role() = 'service_role'
  );

-- Allow insert into wallets during signup
create policy "Allow wallet creation during signup"
  on public.wallets
  for insert
  to authenticated, anon, service_role
  with check (
    exists (
      select 1 from public.users
      where users.id = user_id
    )
    OR
    auth.role() = 'service_role'
  );

-- Wallets table policies
create policy "Wallets are viewable by owner"
  on public.wallets for select
  using (auth.uid() = user_id);

create policy "Users can view wallet transactions"
  on public.transactions for select
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
  on public.rides for select
  using (
    auth.uid() = rider_id or 
    auth.uid() = driver_id
  );

create policy "Riders can request rides"
  on public.rides for insert
  with check (
    auth.uid() = rider_id and
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'rider'
    )
  );

create policy "Drivers can accept rides"
  on public.rides for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'driver'
    )
  )
  with check (
    driver_id = auth.uid() or
    (driver_id is null and status = 'requested')
  );

-- Chat policies
create policy "Chat messages viewable by participants"
  on public.chat_messages for select
  using (
    auth.uid() in (
      select rider_id from public.rides where id = chat_messages.ride_id
      union
      select driver_id from public.rides where id = chat_messages.ride_id
    )
  );

create policy "Chat participants can send messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.rides
      where id = ride_id
      and (rider_id = auth.uid() or driver_id = auth.uid())
    )
  );

create policy "Chat participants can view rooms"
  on public.chat_rooms for select
  using (driver_id = auth.uid() or rider_id = auth.uid());

-- Drive and save wallet policies
create policy "Drivers can view their drive and save wallet"
  on public.drive_and_save_wallets for select
  using (auth.uid() = driver_id);

create policy "Drivers can withdraw from their drive and save wallet"
  on public.drive_and_save_wallets for update
  using (
    auth.uid() = driver_id 
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver' 
      and status = 'active'
    )
  );

-- Drive and save policies
create policy "Drivers can view their savings plan"
  on public.drive_and_save for select
  using (auth.uid() = driver_id);

create policy "Drivers can create savings plan"
  on public.drive_and_save for insert
  with check (
    auth.uid() = driver_id 
    and exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role = 'driver' 
      and status = 'active'
    )
    and not exists (
      select 1 from public.drive_and_save 
      where driver_id = auth.uid() 
      and status = 'active'
    )
    and save_percentage between 1 and 100
    and duration_days in (7, 30, 365)
  );

create policy "Drivers can complete savings plan"
  on public.drive_and_save for update
  using (
    auth.uid() = driver_id
    and end_date <= now()
    and status = 'active'
  )
  with check (status = 'completed');

create policy "Drivers can break savings plan"
  on public.drive_and_save for update
  using (
    auth.uid() = driver_id 
    and status = 'active'
    and exists (
      select 1 from public.drive_and_save_wallets 
      where driver_id = auth.uid() 
      and balance = 0
    )
  )
  with check (status = 'broken');

create policy "Drivers can delete inactive savings plan"
  on public.drive_and_save for delete
  using (
    auth.uid() = driver_id 
    and status != 'active'
  );


