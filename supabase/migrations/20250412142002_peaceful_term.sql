/*
  # Initialize all user features to zero

  1. Changes
    - Add new columns to profiles table for tracking features
    - Set default values to 0 for all counters
    - Update handle_new_user function to initialize new fields

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS books_exchanged integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS library_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS wishlist_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS history_count integer DEFAULT 0;

-- Update the handle_new_user function to include the new fields
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    first_name,
    last_name,
    birthdate,
    books_read,
    reading_hours,
    current_streak,
    books_exchanged,
    library_count,
    wishlist_count,
    history_count
  )
  VALUES (
    new.id,
    new.email,
    'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    (new.raw_user_meta_data->>'birthdate')::date,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;