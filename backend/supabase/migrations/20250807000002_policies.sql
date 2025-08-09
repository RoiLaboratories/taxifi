-- Drop existing policies
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can verify their own email" on public.users;
drop policy if exists "Users can verify their email" on public.users;
drop policy if exists "Users can view their own wallet" on public.wallets;
drop policy if exists "Riders and drivers can view their rides" on public.rides;
drop policy if exists "Riders can create rides" on public.rides;
drop policy if exists "Riders and drivers can update their rides" on public.rides;
drop policy if exists "Drivers can view their drive and save wallet" on public.drive_and_save_wallets;
drop policy if exists "Drivers can withdraw from their drive and save wallet" on public.drive_and_save_wallets;
drop policy if exists "Drivers can view their savings plan" on public.drive_and_save;
drop policy if exists "Drivers can create savings plan" on public.drive_and_save;
drop policy if exists "Drivers can complete savings plan" on public.drive_and_save;
drop policy if exists "Drivers can break savings plan" on public.drive_and_save;
drop policy if exists "Drivers can delete inactive savings plan" on public.drive_and_save;
drop policy if exists "Drivers can complete their savings plan" on public.drive_and_save;
drop policy if exists "Drivers can break their savings plan" on public.drive_and_save;
drop policy if exists "Drivers can delete their inactive savings plan" on public.drive_and_save;
drop policy if exists "Chat participants can view messages" on public.chat_messages;
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
alter table public.chat_typing enable row level security;

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can verify their email"
  on public.users for update
  using (
    auth.uid() = id
    and not email_verified
  );

-- Wallets policies
create policy "Users can view their own wallet"
  on public.wallets for select
  using (auth.uid() = user_id);

-- Rides policies
create policy "Riders and drivers can view their rides"
  on public.rides for select
  using (auth.uid() = rider_id or auth.uid() = driver_id);

create policy "Riders can create rides"
  on public.rides for insert
  with check (auth.uid() = rider_id);

create policy "Riders and drivers can update their rides"
  on public.rides for update
  using (auth.uid() = rider_id or auth.uid() = driver_id);

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

-- Chat policies
create policy "Chat participants can view messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_rooms
      where (driver_id = auth.uid() or rider_id = auth.uid())
      and id = chat_messages.ride_id
    )
  );

create policy "Chat participants can send messages"
  on public.chat_messages for insert
  with check (auth.uid() = sender_id);

create policy "Chat participants can view rooms"
  on public.chat_rooms for select
  using (driver_id = auth.uid() or rider_id = auth.uid());
