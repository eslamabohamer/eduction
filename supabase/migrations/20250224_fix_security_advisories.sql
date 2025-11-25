/*
  # Security Hardening & Fixes
  
  ## Security Updates:
  1. Fix "Function Search Path Mutable" warnings by setting search_path on functions.
  2. Ensure RLS is enabled on all public tables.
  3. Add policy for 'notifications' table if missing.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Fix Search Path on Functions (Security Best Practice)
-- Re-defining functions with explicit search_path

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

CREATE OR REPLACE FUNCTION public.create_student_record(
  p_name text,
  p_username text,
  p_grade text,
  p_level text,
  p_dob timestamptz DEFAULT NULL
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
  v_student_role text := 'Student';
BEGIN
  -- Get current user's tenant
  v_tenant_id := get_my_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a tenant';
  END IF;

  -- Create entry in public.users (Simulating a user creation)
  -- In a real app, this might be linked to an auth.users entry created via Admin API
  -- For now, we create a placeholder user record
  INSERT INTO public.users (name, username, role, tenant_id, created_at)
  VALUES (p_name, p_username, v_student_role, v_tenant_id, now())
  RETURNING id INTO v_user_id;

  -- Create Student Profile
  INSERT INTO public.student_profiles (
    user_id, 
    tenant_id, 
    grade, 
    level, 
    student_code
  )
  VALUES (
    v_user_id,
    v_tenant_id,
    p_grade,
    p_level,
    encode(gen_random_bytes(4), 'hex') -- Generate random code
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

-- 2. Ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Fix RLS for Notifications if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications" 
        ON public.notifications FOR SELECT 
        USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;
