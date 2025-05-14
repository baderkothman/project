/*
  # Add unique constraint to messages table

  1. Changes
    - Add unique constraint on (sender_id, recipient_id, created_at)
    - Create supporting index for better performance
    - Drop existing constraint if it exists to avoid conflicts

  2. Purpose
    - Ensure no duplicate messages at the exact same timestamp
    - Improve query performance for message lookups
*/

-- Drop existing constraint and index if they exist
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_sender_recipient_created_unique;

DROP INDEX IF EXISTS idx_messages_sender_recipient_created;

-- Add unique constraint
ALTER TABLE messages
ADD CONSTRAINT messages_sender_recipient_created_unique 
UNIQUE (sender_id, recipient_id, created_at);

-- Create index for better query performance
CREATE INDEX idx_messages_sender_recipient_created 
ON messages (sender_id, recipient_id, created_at);