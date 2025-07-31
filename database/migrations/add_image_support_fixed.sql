-- Fix for image support - handle NOT NULL constraint on content
-- This is a safer approach that doesn't require altering the existing content column

-- Add image support columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image'));

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Allow authenticated users to upload images to their own folder
CREATE POLICY IF NOT EXISTS "Users can upload their own images" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow authenticated users to view all images
CREATE POLICY IF NOT EXISTS "Authenticated users can view images" ON storage.objects
FOR SELECT 
TO authenticated
USING (bucket_id = 'chat-images');

-- Allow authenticated users to delete their own images
CREATE POLICY IF NOT EXISTS "Users can delete their own images" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'chat-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Update the messages view to include image fields
DROP VIEW IF EXISTS messages_with_username;
CREATE VIEW messages_with_username AS
SELECT 
    m.id,
    m.content,
    m.user_id,
    m.created_at,
    m.image_url,
    m.message_type,
    up.username
FROM messages m
LEFT JOIN user_profiles up ON m.user_id = up.user_id
ORDER BY m.created_at ASC;

-- Grant permissions on the updated view
GRANT SELECT ON messages_with_username TO authenticated;

-- Note: We're NOT altering the content column to be nullable
-- Instead, we'll always provide a default value like 'Image' when sending image-only messages
-- This is safer for existing data and maintains backward compatibility