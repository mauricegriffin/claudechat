-- Create typing_indicators table for real-time typing status
CREATE TABLE typing_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_typing BOOLEAN DEFAULT true NOT NULL,
    last_typed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all typing indicators
CREATE POLICY "Allow authenticated users to read typing indicators" ON typing_indicators
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow users to insert/update their own typing indicator
CREATE POLICY "Allow users to manage own typing indicator" ON typing_indicators
    FOR ALL USING (auth.uid() = user_id);

-- Create an index for faster lookups
CREATE INDEX idx_typing_indicators_user_id ON typing_indicators(user_id);
CREATE INDEX idx_typing_indicators_last_typed ON typing_indicators(last_typed_at);

-- Create a view that includes username for easier querying
CREATE OR REPLACE VIEW typing_indicators_with_username AS
SELECT 
    ti.id,
    ti.user_id,
    ti.is_typing,
    ti.last_typed_at,
    ti.created_at,
    up.username
FROM typing_indicators ti
LEFT JOIN user_profiles up ON ti.user_id = up.user_id
WHERE ti.is_typing = true 
  AND ti.last_typed_at > NOW() - INTERVAL '5 seconds'; -- Only show active typers

-- Grant permissions on the view
GRANT SELECT ON typing_indicators_with_username TO authenticated;

-- Create a function to clean up stale typing indicators
CREATE OR REPLACE FUNCTION cleanup_stale_typing_indicators()
RETURNS void AS $$
BEGIN
    -- Set is_typing to false for indicators older than 5 seconds
    UPDATE typing_indicators
    SET is_typing = false
    WHERE is_typing = true 
      AND last_typed_at < NOW() - INTERVAL '5 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a cron job to run cleanup every 10 seconds
-- Note: This requires pg_cron extension to be enabled in Supabase
-- SELECT cron.schedule('cleanup-typing-indicators', '*/10 * * * * *', 'SELECT cleanup_stale_typing_indicators();');