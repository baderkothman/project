/*
  # Update shared_books table to match messages table structure

  1. Changes
    - Rename shared_at to created_at for consistency with messages table
    - Add indexes for better query performance
    - Update trigger function to handle sorting

  2. Security
    - Maintain existing RLS policies
*/

-- Rename shared_at to created_at for consistency
ALTER TABLE shared_books 
RENAME COLUMN shared_at TO created_at;

-- Add index for sorting
CREATE INDEX IF NOT EXISTS idx_shared_books_created_at 
ON shared_books(created_at);

-- Create function to get combined chat items
CREATE OR REPLACE FUNCTION get_chat_items(
  chat_user_id uuid,
  other_user_id uuid,
  page_size int DEFAULT 50,
  last_timestamp timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id text,
  content text,
  sender_id uuid,
  recipient_id uuid,
  created_at timestamptz,
  item_type text,
  book_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  (
    -- Get messages
    SELECT 
      m.id::text,
      m.content,
      m.sender_id,
      m.recipient_id,
      COALESCE(m.created_at, NOW()) as created_at,
      'message' as item_type,
      NULL as book_data
    FROM messages m
    WHERE 
      (m.sender_id = chat_user_id AND m.recipient_id = other_user_id) OR
      (m.sender_id = other_user_id AND m.recipient_id = chat_user_id)
    AND (last_timestamp IS NULL OR m.created_at < last_timestamp)
  )
  UNION ALL
  (
    -- Get shared books
    SELECT 
      sb.id::text,
      sb.title as content,
      sb.sender_id,
      sb.recipient_id,
      COALESCE(sb.created_at, NOW()) as created_at,
      'shared_book' as item_type,
      jsonb_build_object(
        'book_id', sb.book_id,
        'title', sb.title,
        'image', sb.image,
        'preview_link', sb.preview_link
      ) as book_data
    FROM shared_books sb
    WHERE 
      (sb.sender_id = chat_user_id AND sb.recipient_id = other_user_id) OR
      (sb.sender_id = other_user_id AND sb.recipient_id = chat_user_id)
    AND (last_timestamp IS NULL OR sb.created_at < last_timestamp)
  )
  ORDER BY created_at ASC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
REVOKE EXECUTE ON FUNCTION get_chat_items(uuid, uuid, int, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_chat_items(uuid, uuid, int, timestamptz) TO authenticated;