-- Create drivers table
create table if not exists public.drivers (
    id uuid primary key references auth.users(id) on delete cascade,
    is_online boolean default false,
    active_ride uuid references public.rides(id),
    last_location jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Function to automatically create a driver record when a user is created with role='driver'
create or replace function public.handle_new_driver()
returns trigger as $$
begin
    if new.role = 'driver' then
        insert into public.drivers (id)
        values (new.id);
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to create driver record when a new driver user is created
drop trigger if exists on_new_driver on public.users;
create trigger on_new_driver
    after insert on public.users
    for each row
    execute function public.handle_new_driver();

-- Enable Row Level Security
alter table public.drivers enable row level security;

-- Policy to allow drivers to read their own records
create policy "Drivers can read their own record"
    on public.drivers
    for select
    using (auth.uid() = id);

-- Policy to allow drivers to update their own online status and last_location
create policy "Drivers can update their own online status and location"
    on public.drivers
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Policy to allow the system to insert new driver records
create policy "System can create driver records"
    on public.drivers
    for insert
    with check (auth.uid() = id);

-- Policy to allow the system to update active_ride status
create policy "System can update active ride status"
    on public.drivers
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Grant necessary permissions to authenticated users
grant usage on schema public to authenticated;
grant select, update(is_online, last_location) on public.drivers to authenticated;
grant insert on public.drivers to authenticated;
