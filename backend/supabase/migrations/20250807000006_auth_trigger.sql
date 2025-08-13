-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare 
  wallet_account_number text;
begin
  raise log 'Starting handle_new_user trigger for user ID: %', new.id;
  raise log 'User metadata: %', new.raw_user_meta_data;
  
  -- Generate a unique wallet account number (10 digits)
  wallet_account_number := to_char(floor(random() * 9000000000 + 1000000000), 'FM9999999999');
  raise log 'Generated wallet account number: %', wallet_account_number;
  
  -- Insert the user with the generated wallet_id
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
    wallet_account_number,
    'active'
  )
  returning id into new.id;
  
  raise log 'User inserted successfully with ID: %', new.id;

  -- Create the wallet for the user
  insert into public.wallets (
    user_id,
    account_number,
    balance
  ) values (
    new.id,
    wallet_account_number,
    0
  );
  
  raise log 'Wallet created successfully for user ID: %', new.id;
  return new;
exception
  when others then
    raise log 'Error in handle_new_user for ID %: % - State: %', new.id, SQLERRM, SQLSTATE;
    raise log 'Raw user metadata at time of error: %', new.raw_user_meta_data;
    return null; -- Return null to indicate the trigger failed
end;
$$;

-- Drop and recreate the trigger with explicit schema references
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Create trigger to automatically create user profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
