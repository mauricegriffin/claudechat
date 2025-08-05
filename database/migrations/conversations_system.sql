-- Conversations System Migration
-- Adds support for one-on-one messaging and conversation management

-- Main conversations table
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('group', 'direct')),
    name TEXT, -- 'Everyone' for main group, NULL for direct messages
    participant_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants junction table
CREATE TABLE conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

-- Update messages table for conversation context
ALTER TABLE messages ADD COLUMN conversation_id UUID REFERENCES conversations(id);
ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id); -- Future enhancement

-- Indexes for performance
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Enable RLS on new tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Admin can see all conversations (requirement: admin visibility)
CREATE POLICY "Admin can manage all conversations" ON conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND (username = 'admin' OR username ILIKE '%admin%')
        )
    );

-- Users can see conversations they're part of
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = auth.uid()
        )
    );

-- Users can create new conversations
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update conversations they created or are admin of
CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = auth.uid() 
            AND cp.is_admin = true
        )
    );

-- Participant policies
CREATE POLICY "Users can view conversation participants" ON conversation_participants
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM conversation_participants cp2 
            WHERE cp2.conversation_id = conversation_participants.conversation_id 
            AND cp2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join conversations" ON conversation_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their participation" ON conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Update message policy for conversations
DROP POLICY IF EXISTS "Allow authenticated users to read messages" ON messages;
CREATE POLICY "Users can read conversation messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
        ) OR
        -- Admin can read all messages
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND (username = 'admin' OR username ILIKE '%admin%')
        )
    );

-- Update message insert policy for conversations  
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON messages;
CREATE POLICY "Users can insert messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
        )
    );

-- Create the main "Everyone" group conversation
INSERT INTO conversations (id, type, name, created_by, participant_count) 
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'group', 
    'Everyone', 
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    (SELECT COUNT(*) FROM auth.users)
);

-- Add all existing users to the Everyone group
INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    id,
    -- First user becomes admin
    CASE WHEN id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) 
         THEN TRUE ELSE FALSE END
FROM auth.users;

-- Associate all existing messages with Everyone group
UPDATE messages 
SET conversation_id = '00000000-0000-0000-0000-000000000001' 
WHERE conversation_id IS NULL;

-- Update last_message_at for Everyone group
UPDATE conversations 
SET last_message_at = (
    SELECT MAX(created_at) FROM messages 
    WHERE conversation_id = '00000000-0000-0000-0000-000000000001'
)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Function to automatically add new users to Everyone group
CREATE OR REPLACE FUNCTION public.add_user_to_everyone_group()
RETURNS trigger AS $$
BEGIN
  -- Add new user to Everyone group
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id);
  
  -- Update participant count
  UPDATE public.conversations 
  SET participant_count = participant_count + 1 
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add new users to Everyone group
CREATE TRIGGER on_user_created_add_to_everyone
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.add_user_to_everyone_group();

-- Function to update conversation last_message_at when new message is added
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations 
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation timestamp on new messages
CREATE TRIGGER on_message_inserted_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Enable real-time subscriptions for new tables
-- Note: This should be enabled in Supabase dashboard under Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- Grant permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversation_participants TO authenticated;