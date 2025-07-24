-- Settings Setup SQL
-- This script ensures the database is properly configured for user settings

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON user_profiles;

-- Create policy to allow authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read profiles" ON user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Allow users to insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Create a function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only insert if username is provided in raw_user_meta_data
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update messages view to include username (optional, for easier querying)
CREATE OR REPLACE VIEW messages_with_username AS
SELECT 
    m.id,
    m.created_at,
    m.content,
    m.user_id,
    up.username
FROM messages m
LEFT JOIN user_profiles up ON m.user_id = up.user_id;

-- Grant permissions on the view
GRANT SELECT ON messages_with_username TO authenticated;

-- Grant permissions on user_profiles table
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated; 