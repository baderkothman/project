/*
  # Update shared books table schema

  1. Changes
    - Add book_id column to shared_books table
    - Rename book_title to title for consistency
    - Rename book_image to image for consistency
    - Rename book_link to preview_link for clarity
    - Update column order for better organization

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing table
DROP TABLE IF EXISTS shared_books;

-- Create shared_books table with updated schema
CREATE TABLE shared_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id text NOT NULL,
  sender_id uuid REFERENCES profiles(id),
  recipient_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  image text,
  preview_link text,
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
    auth.uid() = recipient_id
  );

CREATE POLICY "Users can share books"
  ON shared_books
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Create indexes for better performance
CREATE INDEX idx_shared_books_book_id ON shared_books(book_id);
CREATE INDEX idx_shared_books_sender ON shared_books(sender_id);
CREATE INDEX idx_shared_books_recipient ON shared_books(recipient_id);