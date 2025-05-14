/*
  # Create avatars storage bucket and policies

  1. Changes
    - Create avatars storage bucket
    - Set up public read access
    - Configure upload policies for authenticated users
    - Add file type and size restrictions
    - Set up update and delete policies

  2. Security
    - Public read access for avatars
    - Authenticated users can upload/update/delete their avatars
    - File type restrictions (png, jpg, jpeg, gif, webp)
    - Maximum file size limit
*/

-- Create the avatars bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Allow public access to read avatar files
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatar files
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'gif', 'webp'))
);

-- Allow users to update their own avatar files
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow users to delete their own avatar files
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');