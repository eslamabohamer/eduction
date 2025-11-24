/*
  # Security Hardening & RLS Fixes
  
  ## Query Description:
  This migration addresses critical security advisories by:
  1. Enabling Row Level Security (RLS) on ALL tables.
  2. Fixing "Search Path Mutable" warnings in functions.
  3. Implementing strict Tenant Isolation policies.
  4. enforcing Role-Based Access Control (RBAC) for Secretaries (Admin access vs Academic restriction).

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: true
  - Reversible: true

  ## Structure Details:
  - Functions: get_my_tenant_id, get_my_role, create_student_record (Replaced)
  - Tables: All public tables
*/

-- 1. Fix Helper Functions (Security Definer + Search Path)
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

-- 2. Fix create_student_record (Drop first to avoid return type error)
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
  v_user_id uuid;
  v_profile_id uuid;
  v_tenant_id uuid;
  v_role text;
BEGIN
  -- Check if requester is Teacher or Secretary
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_role NOT IN ('Teacher', 'Secretary') THEN
    RAISE EXCEPTION 'Unauthorized: Only Teachers or Secretaries can add students';
  END IF;

  -- Create entry in public.users (Virtual user for student)
  -- Note: This creates a DB record, not a Supabase Auth user. 
  -- In a real app, you'd use an Edge Function to create the Auth user.
  INSERT INTO public.users (name, username, role, tenant_id, auth_id)
  VALUES (p_name, p_username, 'Student', v_tenant_id, gen_random_uuid())
  RETURNING id INTO v_user_id;

  -- Create profile
  INSERT INTO public.student_profiles (user_id, student_code, grade, level, tenant_id)
  VALUES (
    v_user_id,
    upper(substring(md5(random()::text) from 1 for 6)), -- Random 6-char code
    p_grade,
    p_level,
    v_tenant_id
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

-- 3. Enable RLS on ALL Tables (Fixes "RLS Disabled" Critical Errors)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Define Policies

-- USERS
DROP POLICY IF EXISTS "Users view own or tenant" ON public.users;
CREATE POLICY "Users view own or tenant" ON public.users
FOR SELECT USING (
  auth_id = auth.uid() OR 
  tenant_id = get_my_tenant_id()
);

-- STUDENT PROFILES
DROP POLICY IF EXISTS "Tenant access profiles" ON public.student_profiles;
CREATE POLICY "Tenant access profiles" ON public.student_profiles
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- CLASSROOMS
DROP POLICY IF EXISTS "Tenant access classrooms" ON public.classrooms;
CREATE POLICY "Tenant access classrooms" ON public.classrooms
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- EXAMS (Secretary CAN schedule/view exams, but NOT submissions)
DROP POLICY IF EXISTS "Tenant access exams" ON public.exams;
CREATE POLICY "Tenant access exams" ON public.exams
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- EXAM QUESTIONS
DROP POLICY IF EXISTS "Tenant access questions" ON public.exam_questions;
CREATE POLICY "Tenant access questions" ON public.exam_questions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id AND e.tenant_id = get_my_tenant_id()
  )
);

-- EXAM SUBMISSIONS (CRITICAL: Block Secretary)
DROP POLICY IF EXISTS "Teacher view submissions" ON public.exam_submissions;
CREATE POLICY "Teacher view submissions" ON public.exam_submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id AND e.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() = 'Teacher' -- Only Teacher, NOT Secretary
);

DROP POLICY IF EXISTS "Student view own submissions" ON public.exam_submissions;
CREATE POLICY "Student view own submissions" ON public.exam_submissions
FOR SELECT USING (
  student_id IN (
    SELECT id FROM public.student_profiles WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Student create submissions" ON public.exam_submissions;
CREATE POLICY "Student create submissions" ON public.exam_submissions
FOR INSERT WITH CHECK (
  student_id IN (
    SELECT id FROM public.student_profiles WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  )
);

-- HOMEWORK & SUBMISSIONS (Allow Secretary to view homework, but maybe grade? Let's allow)
DROP POLICY IF EXISTS "Tenant access homework" ON public.homework;
CREATE POLICY "Tenant access homework" ON public.homework
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

DROP POLICY IF EXISTS "Tenant access homework submissions" ON public.homework_submissions;
CREATE POLICY "Tenant access homework submissions" ON public.homework_submissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.homework h
    WHERE h.id = homework_id AND h.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary') -- Secretary can check homework
);

DROP POLICY IF EXISTS "Student access homework submissions" ON public.homework_submissions;
CREATE POLICY "Student access homework submissions" ON public.homework_submissions
FOR ALL USING (
  student_id IN (
    SELECT id FROM public.student_profiles WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  )
);

-- ADMIN TABLES (Attendance, Finance, Behavior) - Secretary Access REQUIRED
DROP POLICY IF EXISTS "Admin manage attendance" ON public.attendance_records;
CREATE POLICY "Admin manage attendance" ON public.attendance_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = student_id AND s.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary')
);

DROP POLICY IF EXISTS "Admin manage finance" ON public.financial_records;
CREATE POLICY "Admin manage finance" ON public.financial_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = student_id AND s.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary')
);

DROP POLICY IF EXISTS "Admin manage behavior" ON public.behavior_notes;
CREATE POLICY "Admin manage behavior" ON public.behavior_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = student_id AND s.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary')
);

-- VIDEO & LIVE SESSIONS
DROP POLICY IF EXISTS "Tenant access videos" ON public.video_lessons;
CREATE POLICY "Tenant access videos" ON public.video_lessons
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

DROP POLICY IF EXISTS "Tenant access live sessions" ON public.live_sessions;
CREATE POLICY "Tenant access live sessions" ON public.live_sessions
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications
FOR ALL USING (
  user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
);
