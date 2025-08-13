-- Add online status column to drivers table
alter table if exists public.drivers
  add column if not exists is_online boolean default false;
