/*
  # Create USER table with proper RLS policies

  1. New Tables
    - `USER`
      - Primary key using UUID
      - Profile information fields
      - Reading statistics with default values
      - Authentication and verification fields

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Handle new user creation via trigger
*/

-- Drop existing objects to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the USER table with UUID primary key
CREATE TABLE IF NOT EXISTS "USER" (
  userid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(100),
  name varchar(100),
  phone varchar(20),
  gender varchar(10),
  email varchar(100),
  address text,
  bio text,
  profileimage text,
  joindate date DEFAULT CURRENT_DATE,
  logininfo text,
  hashedpassword text,
  planid integer,
  badge varchar(100),
  isverified boolean DEFAULT false,
  books_read integer DEFAULT 0,
  reading_hours integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  following integer DEFAULT 0,
  followers integer DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE "USER" ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can read own data"
  ON "USER"
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = userid::text
  );

-- Create policy for users to update their own data
CREATE POLICY "Users can update own data"
  ON "USER"
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = userid::text
  )
  WITH CHECK (
    auth.uid()::text = userid::text
  );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."USER" (
    userid,
    username,
    name,
    email,
    profileimage,
    joindate,
    books_read,
    reading_hours,
    current_streak,
    following,
    followers
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(CONCAT(new.raw_user_meta_data->>'first_name', ' ', new.raw_user_meta_data->>'last_name'), ' '),
      new.email
    ),
    new.email,
    'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80',
    CURRENT_DATE,
    0,
    0,
    0,
    0,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();