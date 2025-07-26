# Database Setup Guide

The 406 errors you're seeing indicate the `user_profiles` table doesn't exist in your Supabase database yet.

## Quick Fix - Run These SQL Commands in Supabase

1. Go to your Supabase Dashboard → SQL Editor
2. Run the following commands in order:

### 1. Create the user_profiles table:
```sql
-- Create user profiles table to store username and other profile data
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Enable Row Level Security:
```sql
-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read profiles" ON user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Allow users to insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3. Create index for performance:
```sql
-- Create an index on username for faster lookups
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
```

## Alternative: App Works Without Database Setup

The app has been updated to gracefully handle missing database tables:
- ✅ Uses email username as fallback (`user@example.com` → `user`)
- ✅ No more 406 errors - warnings only
- ✅ Chat functionality works normally
- ✅ Profile features will work once table is created

## Messages Table (if needed)

If you also need the messages table:
```sql
-- Create messages table for real-time chat
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all messages
CREATE POLICY "Allow authenticated users to read messages" ON messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert their own messages
CREATE POLICY "Allow authenticated users to insert messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

After running these commands, refresh your app and the 406 errors should be gone!