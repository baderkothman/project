/*
  # Create function for recent chats

  1. New Functions
    - `get_recent_chats()`
      - Returns recent chat messages grouped by conversation
      - Includes user profile information
      - Calculates unread message count
      - Orders by most recent message

  2. Security
    - Function runs with SECURITY DEFINER
    - Execute permission granted only to authenticated users
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS recent_chats;

-- Create a function for recent chats
CREATE OR REPLACE FUNCTION get_recent_chats()
RETURNS TABLE (
  id BIGINT,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  username VARCHAR,
  avatar_url TEXT,
  first_name TEXT,
  last_name TEXT,
  unread_count BIGINT
) AS $$
WITH ranked_messages AS (
  SELECT 
    m.id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.created_at,
    CASE 
      WHEN m.sender_id = auth.uid() THEN m.recipient_id
      ELSE m.sender_id
    END as other_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN sender_id < recipient_id 
          THEN sender_id || ':' || recipient_id
          ELSE recipient_id || ':' || sender_id
        END
      ORDER BY created_at DESC
    ) as rn
  FROM messages m
  WHERE m.sender_id = auth.uid() OR m.recipient_id = auth.uid()
)
SELECT 
  rm.id,
  rm.sender_id,
  rm.recipient_id,
  rm.content,
  rm.created_at,
  rm.other_user_id,
  p.username,
  p.avatar_url,
  p.first_name,
  p.last_name,
  (
    SELECT COUNT(*)
    FROM messages m2
    WHERE 
      m2.recipient_id = auth.uid() 
      AND m2.sender_id = rm.other_user_id
  ) as unread_count
FROM ranked_messages rm
JOIN profiles p ON p.id = rm.other_user_id
WHERE rm.rn = 1
ORDER BY rm.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Revoke execute permission from public and grant it to authenticated role
REVOKE EXECUTE ON FUNCTION get_recent_chats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_recent_chats() TO authenticated;