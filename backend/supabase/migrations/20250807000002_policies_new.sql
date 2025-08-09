-- Drop existing policies if any
drop policy if exists "Enable all access for service role" on public.users;
drop policy if exists "Enable read access for users" on public.users;
drop policy if exists "Enable update access for users" on public.users;
drop policy if exists "Enable insert for authenticated users" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Wallets are viewable by owner" on public.wallets;
drop policy if exists "Users can view wallet transactions" on public.transactions;
drop policy if exists "Rides are viewable by participants" on public.rides;
drop policy if exists "Riders can request rides" on public.rides;
drop policy if exists "Drivers can accept rides" on public.rides;
drop policy if exists "Chat messages viewable by participants" on public.chat_messages;
drop policy if exists "Chat participants can send messages" on public.chat_messages;
drop policy if exists "Chat participants can view rooms" on public.chat_rooms;

-- Drop drive and save policies
drop policy if exists "Drivers can view their savings plan" on public.drive_and_save;
drop policy if exists "Drivers can create savings plan" on public.drive_and_save;
drop policy if exists "Drivers can complete savings plan" on public.drive_and_save;
drop policy if exists "Drivers can break savings plan" on public.drive_and_save;
drop policy if exists "Drivers can delete inactive savings plan" on public.drive_and_save;
drop policy if exists "Drivers can manage savings plan" on public.drive_and_save;
drop policy if exists "Drive and save plans viewable by owner" on public.drive_and_save;

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

-- Users table policies
-- Allow service role full access
create policy "Enable all access for service role"
  on public.users
  to service_role
  using (true)
  with check (true);

-- Allow users to view their own profile
create policy "Enable read access for users"
  on public.users for select
  using (auth.uid() = id);

-- Allow users to update their own profile
create policy "Enable update access for users"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow authenticated users to insert their own profile
create policy "Enable insert for authenticated users"
  on public.users for insert
  with check (auth.uid() = id);

-- Wallets policies
create policy "Wallets are viewable by owner"
  on public.wallets for select
  using (auth.uid() = user_id);

-- Transactions policies
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

-- Rides policies
create policy "Rides are viewable by participants"
  on public.rides for select
  using (auth.uid() = rider_id or auth.uid() = driver_id);

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
    exists (
      select 1 from public.rides
      where id = chat_messages.ride_id
      and (rider_id = auth.uid() or driver_id = auth.uid())
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

create policy "Chat rooms viewable by participants"
  on public.chat_rooms for select
  using (driver_id = auth.uid() or rider_id = auth.uid());

-- Drive and save wallet policies
create policy "Drive and save wallets viewable by owner"
  on public.drive_and_save_wallets for select
  using (auth.uid() = driver_id);

create policy "Drivers can update drive and save wallet"
  on public.drive_and_save_wallets for update
  using (auth.uid() = driver_id);

-- Drive and save policies
create policy "Drive and save plans viewable by owner"
  on public.drive_and_save for select
  using (auth.uid() = driver_id);

create policy "Drivers can create savings plan"
  on public.drive_and_save for insert
  with check (
    auth.uid() = driver_id and
    status = 'active' and
    save_percentage between 1 and 100 and
    duration_days in (7, 30, 365)
  );

create policy "Drivers can manage savings plan"
  on public.drive_and_save for update
  using (auth.uid() = driver_id)
  with check (
    status in ('completed', 'broken') and
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role = 'driver'
      and status = 'active'
    )
  );
