-- Drop all existing policies
drop policy if exists "users_policy" on public.users;
drop policy if exists "rides_policy" on public.rides;

-- Enable RLS
alter table public.users enable row level security;
alter table public.rides enable row level security;

-- Simple policy for users table
create policy "users_policy"
  on public.users
  for all
  using (
    -- Anyone can access during signup and login
    true
  );

-- Simple policy for rides table
create policy "rides_policy"
  on public.rides
  for all
  using (
    -- Users can only access rides they're involved in
    auth.uid() = rider_id 
    or 
    auth.uid() = driver_id
  );

-- Grant basic permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
