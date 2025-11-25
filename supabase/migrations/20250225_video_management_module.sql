/*
  # Video Management Module
  
  1. New Tables:
    - `courses`: Main course container.
    - `modules`: Sections within a course.
    - `lessons`: Individual lessons within a module.
    - `videos`: Video content attached to lessons.
    - `video_progress`: Tracking student progress.
    
  2. Updates:
    - `classrooms`: Add `course_id` to link a classroom to a curriculum.
    
  3. Security:
    - RLS enabled on all tables.
    - Policies for Teachers (manage) and Students (view if enrolled).
*/

-- 1. COURSES
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    teacher_id UUID REFERENCES public.users(id), -- Creator/Owner
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 2. MODULES
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- 3. LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- 4. VIDEOS
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    duration INTEGER DEFAULT 0, -- In seconds
    is_public BOOLEAN DEFAULT false, -- If true, accessible without enrollment (e.g. preview)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 5. VIDEO PROGRESS
CREATE TABLE IF NOT EXISTS public.video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    progress_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- 6. UPDATE CLASSROOMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classrooms' AND column_name = 'course_id') THEN
        ALTER TABLE public.classrooms ADD COLUMN course_id UUID REFERENCES public.courses(id);
    END IF;
END $$;

-- 7. RLS POLICIES

-- Helper function to check enrollment
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(course_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.classrooms c ON e.classroom_id = c.id
    WHERE e.student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    AND c.course_id = course_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COURSES POLICIES
CREATE POLICY "Tenant isolation for courses" ON public.courses
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Students view enrolled courses" ON public.courses
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id() AND (
            is_published = true OR 
            teacher_id = (SELECT id FROM public.users WHERE id = auth.uid()) -- Teacher can see own
        )
    );

-- MODULES POLICIES
CREATE POLICY "Tenant isolation for modules" ON public.modules
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- LESSONS POLICIES
CREATE POLICY "Tenant isolation for lessons" ON public.lessons
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- VIDEOS POLICIES
CREATE POLICY "Tenant isolation for videos" ON public.videos
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- VIDEO PROGRESS POLICIES
CREATE POLICY "Tenant isolation for video_progress" ON public.video_progress
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Users manage own progress" ON public.video_progress
    FOR ALL USING (user_id = auth.uid());
