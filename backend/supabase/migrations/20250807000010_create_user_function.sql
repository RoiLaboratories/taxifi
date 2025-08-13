-- Create a secure function to handle user creation
create or replace function create_new_user(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_phone_number text,
  user_role text
)
returns json
language plpgsql
security definer -- This makes the function run with elevated privileges
set search_path = public -- Prevent search path injection
as $$
declare
  wallet_number text;
  new_user json;
begin
  -- Generate wallet account number (10 digits)
  wallet_number := to_char(floor(random() * 9000000000 + 1000000000), 'FM9999999999');
  
  -- Create wallet first
  insert into public.wallets (
    user_id,
    account_number,
    balance
  ) values (
    user_id,
    wallet_number,
    0
  );

  -- Then create user profile
  insert into public.users (
    id,
    email,
    full_name,
    phone_number,
    role,
    wallet_id,
    status
  ) values (
    user_id,
    user_email,
    user_full_name,
    user_phone_number,
    user_role,
    wallet_number,
    'active'
  )
  returning to_json(users.*) into new_user;

  return new_user;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function create_new_user(uuid, text, text, text, text) to authenticated;
grant execute on function create_new_user(uuid, text, text, text, text) to anon;
