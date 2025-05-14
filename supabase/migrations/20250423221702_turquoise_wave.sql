/*
  # Add unique constraint to messages table

  1. Changes
    - Add unique constraint on messages table for (sender_id, recipient_id, created_at)
    - This ensures message uniqueness between users at specific timestamps
    - Required for proper handling of ON CONFLICT operations

  2. Security
    - No changes to RLS policies
    - Existing table permissions remain unchanged
*/

DO $$ 
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'messages_sender_recipient_created_unique'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_sender_recipient_created_unique 
    UNIQUE (sender_id, recipient_id, created_at);
  END IF;
END $$;