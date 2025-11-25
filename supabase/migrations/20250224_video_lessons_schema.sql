-- Create Storage Buckets for Videos and Thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson_videos', 'lesson_videos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson_thumbnails', 'lesson_thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Videos (Private - Teachers upload, Students view via signed URL)
CREATE POLICY "Teachers can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'lesson_videos' AND (auth.jwt() ->> 'role')::text = 'Teacher' );

CREATE POLICY "Teachers can update/delete their videos"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'lesson_videos' AND (auth.jwt() ->> 'role')::text = 'Teacher' );

-- Students don't need direct SELECT on private buckets if we use signed URLs, 
-- but for thumbnails (public), everyone can view.
CREATE POLICY "Public thumbnails"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'lesson_thumbnails' );

CREATE POLICY "Teachers can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'lesson_thumbnails' AND (auth.jwt() ->> 'role')::text = 'Teacher' );

-- Update video_lessons table
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS video_type text CHECK (video_type IN ('upload', 'youtube', 'vimeo', 'custom')) DEFAULT 'youtube',
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0, -- in seconds
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Create or Update video_progress table (Enhanced tracking)
CREATE TABLE IF NOT EXISTS video_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  video_lesson_id uuid REFERENCES video_lessons(id) ON DELETE CASCADE,
  current_time float DEFAULT 0, -- Last saved position in seconds
  total_duration float DEFAULT 0, -- Total duration in seconds
  percentage integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  last_watched_at timestamptz DEFAULT now(),
  UNIQUE(student_id, video_lesson_id)
);

-- Enable RLS
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Progress
CREATE POLICY "Students manage their own progress"
ON video_progress FOR ALL
TO authenticated
USING ( 
  student_id IN (
    SELECT id FROM student_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT id FROM student_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Teachers view progress for their classes"
ON video_progress FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM video_lessons vl
    JOIN classrooms c ON vl.classroom_id = c.id
    WHERE vl.id = video_progress.video_lesson_id
    AND c.teacher_id = auth.uid()
  )
);

-- Parents view progress of their children
CREATE POLICY "Parents view child progress"
ON video_progress FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = video_progress.student_id
    AND sp.parent_access_code = (current_setting('app.current_parent_code', true))
  )
);
