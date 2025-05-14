/*
  # Add unique constraint to messages table

  1. Changes
    - Add unique constraint on messages table for sender_id, recipient_id, and created_at
    - This prevents duplicate messages being sent at the exact same time
    - Enables proper conflict resolution for message handling

  2. Security
    - Maintains existing RLS policies
    - No changes to security model needed
*/

-- Add unique constraint to messages table
ALTER TABLE messages
ADD CONSTRAINT messages_sender_recipient_created_unique 
UNIQUE (sender_id, recipient_id, created_at);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient_created 
ON messages (sender_id, recipient_id, created_at);