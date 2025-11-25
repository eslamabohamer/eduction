/*
  # Video Lessons Module - Manual Fix
  
  ## Metadata:
  - Schema-Category: "Feature"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  
  ## Description:
  Creates tables for video lessons and progress tracking.
  Sets up Storage buckets for videos and thumbnails.
  Enables RLS and policies.
*/

-- 1. Create Video Lessons Table
CREATE TABLE IF NOT EXISTS public.video_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id),
    video_type TEXT CHECK (video_type IN ('upload', 'youtube', 'vimeo', 'custom')),
    video_url TEXT, -- For external links
    storage_path TEXT, -- For uploaded files
    thumbnail_url TEXT,
    duration INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Video Progress Table
CREATE TABLE IF NOT EXISTS public.video_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    video_lesson_id UUID REFERENCES public.video_lessons(id) ON DELETE CASCADE,
    current_time INTEGER DEFAULT 0, -- last saved position in seconds
    total_duration INTEGER DEFAULT 0,
    percentage INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, video_lesson_id)
);

-- 3. Enable RLS
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- 4. Create Storage Buckets (Safe Insert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson_videos', 'lesson_videos', false) -- Private bucket for course videos
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson_thumbnails', 'lesson_thumbnails', true) -- Public bucket for thumbnails
ON CONFLICT (id) DO NOTHING;

-- 5. RLS Policies for Video Lessons

-- Teachers can do everything
DROP POLICY IF EXISTS "Teachers manage own videos" ON public.video_lessons;
CREATE POLICY "Teachers manage own videos" ON public.video_lessons
    FOR ALL
    USING (auth.uid() = teacher_id);

-- Students can view videos of their classrooms
DROP POLICY IF EXISTS "Students view classroom videos" ON public.video_lessons;
CREATE POLICY "Students view classroom videos" ON public.video_lessons
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.student_profiles sp ON sp.id = e.student_id
            WHERE sp.user_id = auth.uid()
            AND e.classroom_id = public.video_lessons.classroom_id
        )
    );

-- 6. RLS Policies for Video Progress

-- Students manage their own progress
DROP POLICY IF EXISTS "Students manage own progress" ON public.video_progress;
CREATE POLICY "Students manage own progress" ON public.video_progress
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = public.video_progress.student_id
            AND sp.user_id = auth.uid()
        )
    );

-- Teachers can view progress for their videos
DROP POLICY IF EXISTS "Teachers view student progress" ON public.video_progress;
CREATE POLICY "Teachers view student progress" ON public.video_progress
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.video_lessons vl
            WHERE vl.id = public.video_progress.video_lesson_id
            AND vl.teacher_id = auth.uid()
        )
    );

-- 7. Storage Policies

-- Teachers upload videos
DROP POLICY IF EXISTS "Teachers upload videos" ON storage.objects;
CREATE POLICY "Teachers upload videos" ON storage.objects
    FOR INSERT
    WITH CHECK ( bucket_id = 'lesson_videos' AND auth.role() = 'authenticated' );

-- Teachers delete videos
DROP POLICY IF EXISTS "Teachers delete videos" ON storage.objects;
CREATE POLICY "Teachers delete videos" ON storage.objects
    FOR DELETE
    USING ( bucket_id = 'lesson_videos' AND auth.role() = 'authenticated' );

-- Students view videos (Signed URLs only, but policy needed for download if token valid)
DROP POLICY IF EXISTS "Authenticated view videos" ON storage.objects;
CREATE POLICY "Authenticated view videos" ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'lesson_videos' AND auth.role() = 'authenticated' );

-- Public thumbnails
DROP POLICY IF EXISTS "Public thumbnails" ON storage.objects;
CREATE POLICY "Public thumbnails" ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'lesson_thumbnails' );

DROP POLICY IF EXISTS "Teachers upload thumbnails" ON storage.objects;
CREATE POLICY "Teachers upload thumbnails" ON storage.objects
    FOR INSERT
    WITH CHECK ( bucket_id = 'lesson_thumbnails' AND auth.role() = 'authenticated' );
