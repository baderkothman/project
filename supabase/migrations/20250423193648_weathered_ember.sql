/*
  # Fix recent_chats table structure

  1. Changes
    - Drop existing recent_chats view and related objects
    - Create recent_chats table with proper structure
    - Add necessary indexes and constraints
    - Update trigger function for maintaining recent chats

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing objects
DROP VIEW IF EXISTS recent_chats;
DROP TRIGGER IF EXISTS on_message_sent ON messages;
DROP FUNCTION IF EXISTS update_recent_chats();

-- Create recent_chats table
CREATE TABLE IF NOT EXISTS recent_chats (
  contact_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  last_message_content text,
  last_message_time timestamptz,
  email text,
  full_name text,
  avatar_url text,
  PRIMARY KEY (user_id, contact_id)
);

-- Enable RLS
ALTER TABLE recent_chats ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view their own recent chats"
  ON recent_chats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy for users to update their own recent chats
CREATE POLICY "Users can update their own recent chats"
  ON recent_chats
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to update recent chats
CREATE OR REPLACE FUNCTION update_recent_chats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert for sender
  INSERT INTO recent_chats (
    user_id,
    contact_id,
    last_message_content,
    last_message_time,
    email,
    full_name,
    avatar_url
  )
  SELECT
    NEW.sender_id,
    NEW.recipient_id,
    NEW.content,
    NEW.created_at,
    p.username,
    CASE 
      WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
      THEN p.first_name || ' ' || p.last_name 
      ELSE p.username 
    END,
    COALESCE(p.avatar_url, 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80')
  FROM profiles p
  WHERE p.id = NEW.recipient_id
  ON CONFLICT (user_id, contact_id) DO UPDATE
  SET
    last_message_content = EXCLUDED.last_message_content,
    last_message_time = EXCLUDED.last_message_time;

  -- Update or insert for recipient
  INSERT INTO recent_chats (
    user_id,
    contact_id,
    last_message_content,
    last_message_time,
    email,
    full_name,
    avatar_url
  )
  SELECT
    NEW.recipient_id,
    NEW.sender_id,
    NEW.content,
    NEW.created_at,
    p.username,
    CASE 
      WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
      THEN p.first_name || ' ' || p.last_name 
      ELSE p.username 
    END,
    COALESCE(p.avatar_url, 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80')
  FROM profiles p
  WHERE p.id = NEW.sender_id
  ON CONFLICT (user_id, contact_id) DO UPDATE
  SET
    last_message_content = EXCLUDED.last_message_content,
    last_message_time = EXCLUDED.last_message_time;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
CREATE TRIGGER on_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_recent_chats();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_recent_chats_user_id ON recent_chats(user_id);