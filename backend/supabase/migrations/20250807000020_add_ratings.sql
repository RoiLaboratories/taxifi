-- Add rating columns to rides table
alter table if exists public.rides
  add column if not exists rider_rating smallint,
  add column if not exists driver_rating smallint,
  add column if not exists rated_by_driver boolean default false,
  add column if not exists rated_by_rider boolean default false;

-- Add constraints to ensure ratings are between 1 and 5
alter table if exists public.rides
  add constraint rider_rating_range 
    check (rider_rating is null or (rider_rating >= 1 and rider_rating <= 5)),
  add constraint driver_rating_range
    check (driver_rating is null or (driver_rating >= 1 and driver_rating <= 5));
