/*
  # Add unique constraint to messages table if it doesn't exist

  1. Changes
    - Safely add unique constraint on messages table for sender_id, recipient_id, and created_at
    - Check for existing constraint before adding
    - Ensure idempotent migration

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

DO $$ 
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'messages_sender_recipient_created_unique'
  ) THEN
    -- Add unique constraint only if it doesn't exist
    ALTER TABLE messages
    ADD CONSTRAINT messages_sender_recipient_created_unique 
    UNIQUE (sender_id, recipient_id, created_at);
  END IF;
END $$;