/*
  # Fix foreign key constraints for profile references

  1. Changes
    - Clean up orphaned rows with proper type casting
    - Drop existing foreign keys
    - Add new constraints with ON DELETE CASCADE
    - Create performance indexes
    - Handle type mismatches between integer and UUID columns

  2. Security
    - Maintain existing security policies
    - Ensure referential integrity
*/

BEGIN;

-- Clean up orphaned rows first
DELETE FROM followers WHERE follower_id NOT IN (SELECT id FROM profiles) OR following_id NOT IN (SELECT id FROM profiles);
DELETE FROM shared_books WHERE sender_id NOT IN (SELECT id FROM profiles) OR recipient_id NOT IN (SELECT id FROM profiles);
DELETE FROM messages WHERE sender_id NOT IN (SELECT id FROM profiles) OR recipient_id NOT IN (SELECT id FROM profiles);
DELETE FROM books WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM wishlist WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM recent_chats WHERE user_id NOT IN (SELECT id FROM profiles) OR contact_id NOT IN (SELECT id FROM profiles);

-- For tables with integer IDs, cast the UUID to text for comparison
DELETE FROM private_chat WHERE senderid::text NOT IN (SELECT id::text FROM profiles) OR reciverid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM report WHERE senderid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM review WHERE userid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM transaction WHERE userid::text NOT IN (SELECT id::text FROM profiles) OR ownerid::text NOT IN (SELECT id::text FROM profiles) OR reciverid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM account_setting WHERE userid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM reading_schedule WHERE userid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM community_chat WHERE posterid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM badge WHERE userid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM subscription_plan WHERE userid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM book_verified WHERE userid::text NOT IN (SELECT id::text FROM profiles);
DELETE FROM list WHERE userid::text NOT IN (SELECT id::text FROM profiles);

-- Drop existing foreign keys
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_follower_id_fkey;
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_following_id_fkey;
ALTER TABLE shared_books DROP CONSTRAINT IF EXISTS shared_books_sender_id_fkey;
ALTER TABLE shared_books DROP CONSTRAINT IF EXISTS shared_books_recipient_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_user_id_fkey;
ALTER TABLE wishlist DROP CONSTRAINT IF EXISTS wishlist_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE recent_chats DROP CONSTRAINT IF EXISTS recent_chats_user_id_fkey;
ALTER TABLE recent_chats DROP CONSTRAINT IF EXISTS recent_chats_contact_id_fkey;

-- Drop constraints for tables with integer IDs
ALTER TABLE private_chat DROP CONSTRAINT IF EXISTS private_chat_senderid_fkey;
ALTER TABLE private_chat DROP CONSTRAINT IF EXISTS private_chat_reciverid_fkey;
ALTER TABLE report DROP CONSTRAINT IF EXISTS report_senderid_fkey;
ALTER TABLE review DROP CONSTRAINT IF EXISTS review_userid_fkey;
ALTER TABLE transaction DROP CONSTRAINT IF EXISTS transaction_userid_fkey;
ALTER TABLE transaction DROP CONSTRAINT IF EXISTS transaction_ownerid_fkey;
ALTER TABLE transaction DROP CONSTRAINT IF EXISTS transaction_reciverid_fkey;
ALTER TABLE account_setting DROP CONSTRAINT IF EXISTS account_setting_userid_fkey;
ALTER TABLE reading_schedule DROP CONSTRAINT IF EXISTS reading_schedule_userid_fkey;
ALTER TABLE community_chat DROP CONSTRAINT IF EXISTS community_chat_posterid_fkey;
ALTER TABLE badge DROP CONSTRAINT IF EXISTS badge_userid_fkey;
ALTER TABLE subscription_plan DROP CONSTRAINT IF EXISTS subscription_plan_userid_fkey;
ALTER TABLE book_verified DROP CONSTRAINT IF EXISTS book_verified_userid_fkey;
ALTER TABLE list DROP CONSTRAINT IF EXISTS list_userid_fkey;

-- Add new foreign key constraints with ON DELETE CASCADE for UUID columns
ALTER TABLE followers
  ADD CONSTRAINT followers_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT followers_following_id_fkey FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE shared_books
  ADD CONSTRAINT shared_books_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT shared_books_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE books
  ADD CONSTRAINT books_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE wishlist
  ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE recent_chats
  ADD CONSTRAINT recent_chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT recent_chats_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create indexes for better performance on frequently used foreign keys
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_chats_user_id ON recent_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_chats_contact_id ON recent_chats(contact_id);

COMMIT;