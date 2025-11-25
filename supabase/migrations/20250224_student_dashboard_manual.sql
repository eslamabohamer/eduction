/*
  # Student Dashboard & Storage Schema
  
  1. Updates student_profiles (avatar, bio, address, phone)
  2. Updates homework_submissions (file_url, status)
  3. Creates Storage Buckets (avatars, homework_uploads)
  4. Sets up RLS policies for storage
*/

-- 1. Update Student Profiles
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text;

-- 2. Update Homework Submissions
ALTER TABLE public.homework_submissions 
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'submitted';

-- 3. Create Storage Buckets (Safe Insert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('homework_uploads', 'homework_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies (Drop first to avoid conflicts)

-- Avatars Policies
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Homework Uploads Policies
DROP POLICY IF EXISTS "Students can upload homework" ON storage.objects;
CREATE POLICY "Students can upload homework"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'homework_uploads' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Students can view own homework files" ON storage.objects;
CREATE POLICY "Students can view own homework files"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'homework_uploads' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Teachers can view all homework files" ON storage.objects;
CREATE POLICY "Teachers can view all homework files"
  ON storage.objects FOR SELECT
  USING ( 
    bucket_id = 'homework_uploads' 
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'Teacher'
    )
  );
