/*
  # Create books storage bucket and policies

  1. Changes
    - Create books storage bucket
    - Set up public read access
    - Configure upload policies for authenticated users
    - Add file type restrictions
    - Set up delete policies with proper type casting

  2. Security
    - Public read access for book images
    - Authenticated users can upload images
    - Users can only delete their own images
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'books');

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'books' AND
  (LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'gif', 'webp'))
);

-- Create policy to allow users to delete their own uploads
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'books' AND 
  (auth.uid() = owner::uuid)
);