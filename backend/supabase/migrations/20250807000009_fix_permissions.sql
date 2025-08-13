-- Add necessary grants for the public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, authenticated, service_role;

-- Allow anonymous users to insert into users table during signup
GRANT INSERT ON public.users TO anon;

-- Ensure the service role can do everything
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Create a trigger to automatically set ID if not provided
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_user_id ON public.users;
CREATE TRIGGER ensure_user_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();
