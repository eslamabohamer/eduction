/*
  # Fix Exams Schema
  
  ## Query Description:
  1. Adds 'status' column to exams table if missing.
  2. Ensures exam_questions and exam_submissions tables exist.
  3. Updates RLS policies for proper student access.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Ensure exams table has status column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'status') THEN
        ALTER TABLE public.exams ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed'));
    END IF;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 3. Update Policies for Exams
DROP POLICY IF EXISTS "Teachers can manage exams" ON public.exams;
CREATE POLICY "Teachers can manage exams" ON public.exams
    FOR ALL
    USING (
        tenant_id = get_my_tenant_id() 
        AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
    );

DROP POLICY IF EXISTS "Students can view published exams" ON public.exams;
CREATE POLICY "Students can view published exams" ON public.exams
    FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND status = 'published'
        AND classroom_id IN (
            SELECT classroom_id FROM public.enrollments 
            WHERE student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
        )
    );

-- 4. Exam Questions Table (Ensure it exists)
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage questions" ON public.exam_questions;
CREATE POLICY "Teachers manage questions" ON public.exam_questions
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.exams WHERE id = exam_questions.exam_id AND tenant_id = get_my_tenant_id())
        AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
    );

DROP POLICY IF EXISTS "Students view questions" ON public.exam_questions;
CREATE POLICY "Students view questions" ON public.exam_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE id = exam_questions.exam_id 
            AND status = 'published'
            AND classroom_id IN (
                SELECT classroom_id FROM public.enrollments 
                WHERE student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
            )
        )
    );

-- 5. Exam Submissions Table
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  answers JSONB,
  tenant_id UUID NOT NULL DEFAULT get_my_tenant_id(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage their submissions" ON public.exam_submissions;
CREATE POLICY "Students manage their submissions" ON public.exam_submissions
    FOR ALL
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Teachers view submissions" ON public.exam_submissions;
CREATE POLICY "Teachers view submissions" ON public.exam_submissions
    FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
    );
