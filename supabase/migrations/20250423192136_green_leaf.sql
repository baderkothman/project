/*
  # Fix recent chats trigger function

  1. Changes
    - Update trigger function to correctly handle profile data
    - Fix profile data selection for both sender and recipient
    - Ensure proper data synchronization
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_message_sent ON messages;
DROP FUNCTION IF EXISTS update_recent_chats();

-- Create improved function to update recent chats
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

-- Recreate trigger
CREATE TRIGGER on_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_recent_chats();