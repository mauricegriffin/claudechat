-- Check messages table structure and policies
-- Run this in your Supabase SQL Editor

-- Check if RLS is enabled on messages table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'messages';

-- Check RLS policies on messages table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'messages';

-- Check current message count
SELECT COUNT(*) as total_messages FROM messages;

-- Show table structure
\d messages;