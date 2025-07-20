-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON messages;

-- Create messages table for real-time chat (if not exists)
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all messages
CREATE POLICY "Users can view all messages" ON messages
    FOR SELECT 
    USING (true);

-- Create policy to allow authenticated users to insert their own messages
CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own messages (optional)
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own messages (optional)
CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Enable real-time subscriptions on the messages table
-- Note: This must be done in the Supabase dashboard under Database > Replication
-- Enable real-time for the messages table