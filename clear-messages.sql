-- Clear all messages from the database
-- Run this in your Supabase SQL Editor

-- First, check current message count
SELECT COUNT(*) as current_messages FROM messages;

-- Option 1: Try basic delete
DELETE FROM messages;

-- If that doesn't work due to RLS, try with service role
-- Option 2: Disable RLS temporarily (be careful!)
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- DELETE FROM messages;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Option 3: Delete using service role context
-- You may need to run this as the service role user
-- SET role service_role;
-- DELETE FROM messages;
-- RESET role;

-- Verify deletion
SELECT COUNT(*) as remaining_messages FROM messages;

-- Show any remaining messages (for debugging)
SELECT id, content, created_at, user_id FROM messages LIMIT 10;