-- Set proper role for auth changes
SET SESSION ROLE service_role;

-- Update auth settings using Supabase's auth.users table
ALTER TABLE auth.users 
  ALTER COLUMN confirmed_at 
  SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE auth.users 
  ALTER COLUMN email_confirmed_at 
  SET DEFAULT CURRENT_TIMESTAMP;

-- Reset role
RESET ROLE;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres, service_role;
