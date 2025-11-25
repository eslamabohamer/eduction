/*
  # Create Exams and Assessments Schema
  
  ## Structure Details:
  - `exams`: Stores exam metadata (title, dates, classroom link).
  - `exam_questions`: Stores questions linked to an exam. Supports different types (MCQ, Text).
  - `exam_submissions`: Stores student attempts and scores.
  
  ## Security:
  - RLS enabled on all tables.
  - Teachers can manage exams for their tenant.
  - Students can view exams for their enrolled classrooms.
*/

-- Create Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_marks INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Exam Questions Table
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'TrueFalse', 'ShortAnswer', 'Essay')),
    options JSONB, -- Array of strings for MCQ options
    correct_answer TEXT, -- Stored answer for auto-grading
    points INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Exam Submissions Table
CREATE TABLE IF NOT EXISTS public.exam_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.student_profiles(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    score INTEGER,
    answers JSONB, -- Key-value pair: question_id -> student_answer
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for Exams
CREATE POLICY "Teachers can manage exams" ON public.exams
    FOR ALL USING (
        tenant_id = get_my_tenant_id() 
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Teacher')
    );

CREATE POLICY "Students can view published exams for their classes" ON public.exams
    FOR SELECT USING (
        tenant_id = get_my_tenant_id()
        AND status = 'published'
        AND classroom_id IN (
            SELECT classroom_id FROM public.enrollments 
            WHERE student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
        )
    );

-- Policies for Questions
CREATE POLICY "Teachers can manage questions" ON public.exam_questions
    FOR ALL USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Teacher')
    );

CREATE POLICY "Students can view questions during exam" ON public.exam_questions
    FOR SELECT USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.exams e
            WHERE e.id = exam_id
            AND e.status = 'published'
            AND e.start_time <= NOW()
        )
    );

-- Policies for Submissions
CREATE POLICY "Teachers can view all submissions" ON public.exam_submissions
    FOR SELECT USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Teacher')
    );

CREATE POLICY "Students can manage their own submissions" ON public.exam_submissions
    FOR ALL USING (
        tenant_id = get_my_tenant_id()
        AND student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
