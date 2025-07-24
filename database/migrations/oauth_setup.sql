-- OAuth Setup SQL
-- This script ensures OAuth users get proper profiles created

-- Update the handle_new_user function to handle OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- For OAuth users, create a profile with email as username if no username provided
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  ELSE
    -- For OAuth users, use email prefix as username
    -- This ensures all users have a profile, even from OAuth
    INSERT INTO public.user_profiles (user_id, username)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 