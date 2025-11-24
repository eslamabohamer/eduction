/*
  # CREATE STORAGE BUCKETS
  This migration creates the necessary storage buckets for the application.
  Specifically fixes "Bucket not found" error for homework attachments.
*/

-- 1. Create 'homework-attachments' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-attachments', 'homework-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects (standard practice, though buckets usually have it)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policies for 'homework-attachments'

-- Allow public read access to homework attachments
CREATE POLICY "Public Access to Homework Attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'homework-attachments' );

-- Allow authenticated users (Teachers/Students) to upload files
CREATE POLICY "Authenticated Users can upload Homework Attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'homework-attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update/delete their own files
CREATE POLICY "Users can update own Homework Attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'homework-attachments' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete own Homework Attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'homework-attachments' 
  AND auth.uid() = owner
);
