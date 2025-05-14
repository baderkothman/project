/*
  # Add user metadata fields

  1. Changes
    - Add new columns to profiles table:
      - first_name (text)
      - last_name (text)
      - birthdate (date)
      - books_read (integer)
      - reading_hours (integer)
      - current_streak (integer)
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS birthdate date,
ADD COLUMN IF NOT EXISTS books_read integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reading_hours integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;

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
    current_streak
  )
  VALUES (
    new.id,
    new.email,
    'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    (new.raw_user_meta_data->>'birthdate')::date,
    COALESCE((new.raw_user_meta_data->>'books_read')::integer, 0),
    COALESCE((new.raw_user_meta_data->>'reading_hours')::integer, 0),
    COALESCE((new.raw_user_meta_data->>'current_streak')::integer, 0)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;