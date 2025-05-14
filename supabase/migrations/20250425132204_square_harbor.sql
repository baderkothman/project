/*
  # Add wishlist functionality

  1. New Tables
    - `wishlist`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `book_id` (uuid, references books)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Create wishlist entries
      - Read their own wishlist
      - Delete from their wishlist
*/

CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create wishlist entries"
  ON wishlist
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own wishlist"
  ON wishlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own wishlist"
  ON wishlist
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_book_id ON wishlist(book_id);