/*
  # Fix Video Views Schema & Policies
  
  1. Checks if `video_views` table exists, creates it if not.
  2. Ensures `video_lesson_id` column exists (adds it if missing).
  3. Re-applies the RLS policies that failed previously.
*/

-- 1. Ensure Table and Columns Exist
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'video_views') THEN
        CREATE TABLE video_views (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            video_lesson_id UUID REFERENCES video_lessons(id) ON DELETE CASCADE,
            student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
            watch_seconds INTEGER DEFAULT 0,
            last_updated TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(video_lesson_id, student_id)
        );
    ELSE
        -- Table exists, check for specific column `video_lesson_id`
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_views' AND column_name = 'video_lesson_id') THEN
            ALTER TABLE video_views ADD COLUMN video_lesson_id UUID REFERENCES video_lessons(id) ON DELETE CASCADE;
        END IF;

        -- Check for `student_id` just in case
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_views' AND column_name = 'student_id') THEN
            ALTER TABLE video_views ADD COLUMN student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE;
        END IF;
        
        -- Ensure Unique Constraint for Upsert
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_views_video_lesson_id_student_id_key') THEN
            ALTER TABLE video_views ADD CONSTRAINT video_views_video_lesson_id_student_id_key UNIQUE (video_lesson_id, student_id);
        END IF;
    END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- 3. Re-create Policies (Safely)

-- Policy: Tenant Access (Teachers/Staff can view all views in their tenant)
DROP POLICY IF EXISTS "Tenant access video views" ON video_views;
CREATE POLICY "Tenant access video views" ON video_views
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM video_lessons vl
        WHERE vl.id = video_views.video_lesson_id
        AND vl.tenant_id = (SELECT get_my_tenant_id())
    )
);

-- Policy: Student Access (Manage their own view records)
DROP POLICY IF EXISTS "Student manage own views" ON video_views;
CREATE POLICY "Student manage own views" ON video_views
FOR ALL
USING (
    student_id IN (
        SELECT id FROM student_profiles 
        WHERE user_id = auth.uid()
    )
);
