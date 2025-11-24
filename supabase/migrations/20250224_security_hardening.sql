-- Secure Helper Functions (Fixing Search Path Warnings)
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  RETURN v_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE auth_id = auth.uid();
  
  RETURN v_role;
END;
$$;

-- Fix create_student_record (Drop first to avoid return type error)
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_student_record(
  p_name text,
  p_username text,
  p_grade text,
  p_level text,
  p_dob text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_profile_id uuid;
  v_fake_auth_id uuid;
BEGIN
  -- Get current user's tenant
  v_tenant_id := get_my_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a tenant';
  END IF;

  -- Generate a placeholder auth_id (In a real app, this would be linked to actual Auth)
  v_fake_auth_id := gen_random_uuid();

  -- 1. Create User Record
  INSERT INTO public.users (auth_id, name, username, role, tenant_id)
  VALUES (v_fake_auth_id, p_name, p_username, 'Student', v_tenant_id)
  RETURNING id INTO v_user_id;

  -- 2. Create Student Profile
  INSERT INTO public.student_profiles (user_id, student_code, grade, level, tenant_id)
  VALUES (
    v_user_id, 
    upper(substring(md5(random()::text) from 1 for 6)), -- Generate random 6-char code
    p_grade, 
    p_level, 
    v_tenant_id
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

-- Enable RLS on ALL Tables (Fixing Critical Advisories)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Users Table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view users in tenant" ON public.users;
CREATE POLICY "Staff can view users in tenant" ON public.users
  FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND 
    (get_my_role() IN ('Teacher', 'Secretary'))
  );

-- 2. Student Profiles
DROP POLICY IF EXISTS "Staff manage tenant students" ON public.student_profiles;
CREATE POLICY "Staff manage tenant students" ON public.student_profiles
  FOR ALL USING (
    tenant_id = get_my_tenant_id() AND 
    (get_my_role() IN ('Teacher', 'Secretary'))
  );

DROP POLICY IF EXISTS "Student view own profile" ON public.student_profiles;
CREATE POLICY "Student view own profile" ON public.student_profiles
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- 3. Administrative Records (Attendance, Finance, Behavior)
-- Grant Secretary FULL access here
DROP POLICY IF EXISTS "Staff manage administrative records" ON public.attendance_records;
CREATE POLICY "Staff manage administrative records" ON public.attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = attendance_records.student_id
      AND sp.tenant_id = get_my_tenant_id()
    ) AND (get_my_role() IN ('Teacher', 'Secretary'))
  );

DROP POLICY IF EXISTS "Staff manage financial records" ON public.financial_records;
CREATE POLICY "Staff manage financial records" ON public.financial_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = financial_records.student_id
      AND sp.tenant_id = get_my_tenant_id()
    ) AND (get_my_role() IN ('Teacher', 'Secretary'))
  );

DROP POLICY IF EXISTS "Staff manage behavior notes" ON public.behavior_notes;
CREATE POLICY "Staff manage behavior notes" ON public.behavior_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = behavior_notes.student_id
      AND sp.tenant_id = get_my_tenant_id()
    ) AND (get_my_role() IN ('Teacher', 'Secretary'))
  );

-- 4. Academic Data (Exams & Grades)
-- RESTRICT Secretary from Submissions (Grades)
DROP POLICY IF EXISTS "Teachers view exam submissions" ON public.exam_submissions;
CREATE POLICY "Teachers view exam submissions" ON public.exam_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      JOIN public.classrooms c ON e.classroom_id = c.id
      WHERE e.id = exam_submissions.exam_id
      AND c.tenant_id = get_my_tenant_id()
    ) AND (get_my_role() = 'Teacher') -- ONLY Teacher, NOT Secretary
  );

DROP POLICY IF EXISTS "Students view own submissions" ON public.exam_submissions;
CREATE POLICY "Students view own submissions" ON public.exam_submissions
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.student_profiles 
      WHERE user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students create submissions" ON public.exam_submissions;
CREATE POLICY "Students create submissions" ON public.exam_submissions
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT id FROM public.student_profiles 
      WHERE user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- 5. Scheduling (Exams Metadata, Live Sessions, Homework)
-- Secretary CAN manage schedules (create exams/sessions) but not see grades
DROP POLICY IF EXISTS "Staff manage exams" ON public.exams;
CREATE POLICY "Staff manage exams" ON public.exams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = exams.classroom_id
      AND c.tenant_id = get_my_tenant_id()
    ) AND (get_my_role() IN ('Teacher', 'Secretary'))
  );

DROP POLICY IF EXISTS "Staff manage live sessions" ON public.live_sessions;
CREATE POLICY "Staff manage live sessions" ON public.live_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = live_sessions.classroom_id
      AND c.tenant_id = get_my_tenant_id()
    ) AND (get_my_role() IN ('Teacher', 'Secretary'))
  );
