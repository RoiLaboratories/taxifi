-- Drop existing tables and recreate without wallet dependencies
drop table if exists public.transactions cascade;
drop table if exists public.drive_and_save cascade;
drop table if exists public.drive_and_save_wallets cascade;
drop table if exists public.rides cascade;
drop table if exists public.wallets cascade;
drop table if exists public.users cascade;

-- Create simplified users table without wallet
create table if not exists public.users (
    id uuid not null,
    email text unique not null,
    phone_number text unique not null,
    full_name text not null,
    role text check (role in ('driver', 'rider')) not null,
    password text,
    status text check (status in ('active', 'inactive', 'pending')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

-- Create simplified rides table
create table if not exists public.rides (
    id uuid default uuid_generate_v4(),
    rider_id uuid not null,
    driver_id uuid,
    pickup_location jsonb not null,
    destination_location jsonb not null,
    status text check (status in ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
    fare decimal(10,2),
    distance decimal(10,2),
    duration integer,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (id),
    constraint rides_rider_id_fkey foreign key (rider_id) references public.users (id) on delete restrict,
    constraint rides_driver_id_fkey foreign key (driver_id) references public.users (id) on delete restrict
);

-- Create or replace the simplified create_new_user function
create or replace function create_new_user(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_phone_number text,
  user_role text,
  user_password text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_user json;
begin
  -- Create user record
  insert into public.users (
    id,
    email,
    full_name,
    phone_number,
    role,
    password,
    status
  ) values (
    user_id,
    user_email,
    user_full_name,
    user_phone_number,
    user_role,
    user_password,
    'active'
  )
  returning to_json(users.*) into new_user;

  return new_user;
end;
$$;

-- Grant execute permission
grant execute on function create_new_user(uuid, text, text, text, text, text) to authenticated;
grant execute on function create_new_user(uuid, text, text, text, text, text) to anon;
