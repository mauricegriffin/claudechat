-- Add email column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN email TEXT;

-- Update the handle_new_user function to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile with email (email is always available) and username if provided
  INSERT INTO public.user_profiles (user_id, email, username)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = NEW.email,
    username = COALESCE(NEW.raw_user_meta_data->>'username', user_profiles.username, split_part(NEW.email, '@', 1)),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles with email addresses from auth.users
-- This query updates existing user_profiles with email from auth.users
UPDATE user_profiles 
SET email = auth_users.email
FROM auth.users auth_users 
WHERE user_profiles.user_id = auth_users.id 
AND user_profiles.email IS NULL;