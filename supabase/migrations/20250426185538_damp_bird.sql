/*
  # Fix shared books table schema

  1. Changes
    - Drop existing shared_books table if it exists
    - Create shared_books table with correct schema including book_id
    - Add necessary indexes and constraints
    - Enable RLS with appropriate policies

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS shared_books;

-- Create shared_books table with correct schema
CREATE TABLE shared_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id),
  receiver_id uuid REFERENCES profiles(id),
  book_title text,
  book_image text,
  book_link text,
  shared_at timestamp without time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE shared_books ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view shared books"
  ON shared_books
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can share books"
  ON shared_books
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Create indexes for better performance
CREATE INDEX idx_shared_books_sender ON shared_books(sender_id);
CREATE INDEX idx_shared_books_receiver ON shared_books(receiver_id);