/*
  # Student Dashboard Enhancements
  
  ## Query Description:
  This migration adds necessary columns for the enhanced student dashboard features:
  1. Homework Submissions: Adds support for file uploads and status tracking.
  2. Student Profiles: Adds avatar, phone, and address fields.
  3. Attendance: Adds duration tracking for live sessions.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: homework_submissions
    - Add: file_urls (text[]), status (text)
  - Table: student_profiles
    - Add: avatar_url (text), phone (text), address (text), bio (text)
  - Table: live_session_attendance
    - Add: leave_time (timestamptz), duration_minutes (int)
*/

-- Enhance Homework Submissions
ALTER TABLE public.homework_submissions 
ADD COLUMN IF NOT EXISTS file_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'submitted'; -- pending, submitted, late, graded

-- Enhance Student Profiles
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS bio text;

-- Enhance Live Session Attendance
ALTER TABLE public.live_session_attendance
ADD COLUMN IF NOT EXISTS leave_time timestamptz,
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 0;

-- Create Storage Bucket for Avatars (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create Storage Bucket for Homework Files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-files', 'homework-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Avatars)
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar."
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

CREATE POLICY "Users can update their own avatar."
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Storage Policies (Homework)
CREATE POLICY "Homework files are accessible by authenticated users."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'homework-files' AND auth.role() = 'authenticated' );

CREATE POLICY "Students can upload homework files."
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'homework-files' AND auth.uid() = owner );
