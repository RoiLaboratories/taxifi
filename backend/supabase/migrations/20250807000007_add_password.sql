-- Add password field to users table
alter table public.users 
add column if not exists password text;

-- Add index on email for faster login queries
create index if not exists users_email_idx on public.users(email);

-- Update the RLS policies to allow password field in insert/update
drop policy if exists "Allow trigger to insert users" on public.users;
create policy "Allow users to sign up"
  on public.users 
  for insert
  to authenticated, anon
  with check (true);

-- Allow users to update their own password
create policy "Allow users to update password"
  on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
