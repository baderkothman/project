/*
  # Add book listing functionality

  1. New Tables
    - `books`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `author` (text)
      - `description` (text)
      - `category` (text)
      - `language` (text)
      - `condition` (text)
      - `price` (numeric)
      - `pages` (integer)
      - `isbn` (text, nullable)
      - `location` (text)
      - `created_at` (timestamp)
      - `images` (text array)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Create their own book listings
      - Read their own book listings
      - Update their own book listings
      - Delete their own book listings
    - Add policy for public to read all book listings
*/

CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text NOT NULL,
  description text,
  category text NOT NULL,
  language text NOT NULL,
  condition text NOT NULL,
  price numeric(10,2) NOT NULL,
  pages integer,
  isbn text,
  location text,
  created_at timestamptz DEFAULT now(),
  images text[] DEFAULT ARRAY[]::text[],
  
  CONSTRAINT positive_price CHECK (price >= 0),
  CONSTRAINT positive_pages CHECK (pages > 0)
);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create their own book listings"
  ON books
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own book listings"
  ON books
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own book listings"
  ON books
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own book listings"
  ON books
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update library count
CREATE OR REPLACE FUNCTION update_library_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET library_count = library_count + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET library_count = library_count - 1
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for library count
CREATE TRIGGER on_book_change
  AFTER INSERT OR DELETE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_library_count();