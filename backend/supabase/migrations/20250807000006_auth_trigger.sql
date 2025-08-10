-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Allow the trigger to bypass RLS
  alter table public.users disable trigger all;
  
  insert into public.users (
    id,
    email,
    full_name,
    phone_number,
    role,
    wallet_id,
    status
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'role',
    new.id,
    'active'
  );
  
  -- Re-enable triggers
  alter table public.users enable trigger all;
  
  return new;
end;
$$;

-- Create trigger to automatically create user profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
