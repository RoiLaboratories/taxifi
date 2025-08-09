-- Create email verification table
create table if not exists email_verification (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  code text not null,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default now() + interval '15 minutes'
);

-- Enable RLS
alter table email_verification enable row level security;

-- Policies
-- Users can only see and verify their own verification codes
create policy "Users can view their own verification codes"
  on email_verification
  for select
  using (auth.uid() = user_id);

create policy "Users cannot insert verification codes directly"
  on email_verification
  for insert
  with check (false);  -- Only allow inserts through the create_verification_code function

create policy "Users cannot update verification codes"
  on email_verification
  for update
  using (false);

create policy "Users cannot delete verification codes"
  on email_verification
  for delete
  using (false);  -- Only allow deletion through the verify_email_code function

-- Add comment to explain security considerations
comment on table email_verification is 'Stores email verification codes with security policies preventing direct access';

-- Function to create verification code
create or replace function create_verification_code(p_user_id uuid, p_email text)
returns text
language plpgsql security definer
as $$
declare
  v_code text;
begin
  -- Generate a 6-digit code
  v_code := generate_verification_code();
  
  -- Delete any existing codes for this user
  delete from email_verification where user_id = p_user_id;
  
  -- Insert new verification code
  insert into email_verification (user_id, email, code)
  values (p_user_id, p_email, v_code);
  
  return v_code;
end;
$$;

-- Function to verify email code
create or replace function verify_email_code(user_email text, verification_code text)
returns boolean
language plpgsql security definer
as $$
declare
  v_user_id uuid;
  v_verification record;
begin
  -- Get user ID from email
  select id into v_user_id
  from auth.users
  where email = user_email;
  
  if v_user_id is null then
    return false;
  end if;
  
  -- Check verification code
  select * into v_verification
  from email_verification
  where user_id = v_user_id
    and code = verification_code
    and expires_at > now();
    
  if v_verification is null then
    return false;
  end if;
  
  -- Mark email as verified
  update auth.users
  set email_confirmed_at = now()
  where id = v_user_id;
  
  -- Delete used verification code
  delete from email_verification where id = v_verification.id;
  
  return true;
end;
$$;
