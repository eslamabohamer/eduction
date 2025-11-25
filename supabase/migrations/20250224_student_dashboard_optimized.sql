/*
  # Student Dashboard & Storage Schema (Optimized)
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
  
  ## Description:
  This script safely sets up the necessary schema for the Student Dashboard, 
  including Profile enhancements, Video Lessons, and Storage Buckets.
  It uses 'IF NOT EXISTS' checks to prevent errors if run multiple times.
*/

-- 1. Enhance Student Profiles (Safely)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE student_profiles ADD COLUMN avatar_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'phone') THEN
        ALTER TABLE student_profiles ADD COLUMN phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'address') THEN
        ALTER TABLE student_profiles ADD COLUMN address text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'bio') THEN
        ALTER TABLE student_profiles ADD COLUMN bio text;
    END IF;
END $$;

-- 2. Enhance Homework Submissions (Safely)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_submissions' AND column_name = 'file_url') THEN
        ALTER TABLE homework_submissions ADD COLUMN file_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_submissions' AND column_name = 'status') THEN
        ALTER TABLE homework_submissions ADD COLUMN status text DEFAULT 'pending';
    END IF;
END $$;

-- 3. Create Video Lessons Table (if missing)
CREATE TABLE IF NOT EXISTS video_lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    classroom_id uuid REFERENCES classrooms(id) ON DELETE CASCADE,
    video_url text NOT NULL,
    provider_type text DEFAULT 'youtube',
    created_at timestamptz DEFAULT now()
);

-- 4. Create Video Views Table (for tracking progress)
CREATE TABLE IF NOT EXISTS video_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
    video_lesson_id uuid REFERENCES video_lessons(id) ON DELETE CASCADE,
    watch_seconds integer DEFAULT 0,
    last_updated timestamptz DEFAULT now(),
    UNIQUE(student_id, video_lesson_id)
);

-- 5. Enable RLS for new tables
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Video Lessons
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_lessons' AND policyname = 'Students can view video lessons of their class') THEN
        CREATE POLICY "Students can view video lessons of their class" ON video_lessons
            FOR SELECT USING (
                classroom_id IN (
                    SELECT classroom_id FROM enrollments 
                    WHERE student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_lessons' AND policyname = 'Teachers can manage video lessons') THEN
        CREATE POLICY "Teachers can manage video lessons" ON video_lessons
            FOR ALL USING (
                auth.jwt() ->> 'role' = 'service_role' OR
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Teacher')
            );
    END IF;
END $$;

-- 7. RLS Policies for Video Views
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_views' AND policyname = 'Students can manage their own video views') THEN
        CREATE POLICY "Students can manage their own video views" ON video_views
            FOR ALL USING (
                student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
            );
    END IF;
END $$;

-- 8. Storage Buckets Setup (Idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('homework_files', 'homework_files', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Storage Policies
DO $$
BEGIN
    -- Avatars
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access to Avatars') THEN
        CREATE POLICY "Public Access to Avatars" ON storage.objects
            FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload avatars') THEN
        CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;
    
    -- Homework Files
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can view homework files') THEN
        CREATE POLICY "Authenticated users can view homework files" ON storage.objects
            FOR SELECT USING (bucket_id = 'homework_files' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload homework files') THEN
        CREATE POLICY "Authenticated users can upload homework files" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'homework_files' AND auth.role() = 'authenticated');
    END IF;
END $$;
