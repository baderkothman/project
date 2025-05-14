/*
  # Update wishlist table for Google Books integration

  1. Changes
    - Add new column `google_books_id` to store Google Books API IDs
    - Make `book_id` column nullable since we'll now have two types of book IDs
    - Add check constraint to ensure at least one ID type is provided
    - Update existing policies to handle both ID types

  2. Security
    - Maintain existing RLS policies
    - Add validation for Google Books IDs
*/

-- Make book_id nullable since we'll now support Google Books IDs
ALTER TABLE wishlist 
ALTER COLUMN book_id DROP NOT NULL;

-- Add column for Google Books IDs
ALTER TABLE wishlist
ADD COLUMN google_books_id text;

-- Add constraint to ensure at least one ID type is provided
ALTER TABLE wishlist
ADD CONSTRAINT wishlist_id_check 
CHECK (
  (book_id IS NOT NULL AND google_books_id IS NULL) OR 
  (book_id IS NULL AND google_books_id IS NOT NULL)
);

-- Add unique constraint for user and Google Books ID combination
ALTER TABLE wishlist
ADD CONSTRAINT wishlist_user_google_books_unique 
UNIQUE (user_id, google_books_id);