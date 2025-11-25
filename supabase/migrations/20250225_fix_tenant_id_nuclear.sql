-- NUCLEAR FIX FOR TENANT_ID TYPE MISMATCH
-- This script:
-- 1. Drops ALL policies to remove dependencies.
-- 2. Converts tenant_id to TEXT on ALL tables.
-- 3. Updates helper functions.
-- 4. Recreates ALL policies.

-- 1. Enable pgcrypto
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. Dynamic DROP of ALL Policies (To clear the way)
DO $$
DECLARE
    r RECORD;
    tables text[] := ARRAY[
        'users', 'student_profiles', 'classrooms', 'enrollments', 
        'exams', 'exam_questions', 'exam_submissions', 
        'homework', 'homework_submissions', 
        'live_sessions', 'live_session_attendance', 
        'video_lessons', 'video_views', 
        'attendance_records', 'behavior_notes', 'financial_records', 'notifications',
        'activity_logs'
    ];
BEGIN
    FOR r IN SELECT policyname, tablename 
             FROM pg_policies 
             WHERE schemaname = 'public' 
             AND tablename = ANY(tables)
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. Update Helper Functions to return TEXT
DROP FUNCTION IF EXISTS public.get_my_tenant_id();

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id text;
BEGIN
  SELECT tenant_id::text INTO v_tenant_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  RETURN v_tenant_id;
END;
$$;

-- 4. Convert tenant_id to TEXT on ALL tables
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'users', 'student_profiles', 'classrooms', 'enrollments', 
        'exams', 'exam_questions', 'exam_submissions', 
        'homework', 'homework_submissions', 
        'live_sessions', 'live_session_attendance', 
        'video_lessons', 'video_views', 
        'attendance_records', 'behavior_notes', 'financial_records', 'notifications',
        'activity_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tenant_id') THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id TYPE text', t);
        END IF;
    END LOOP;
END $$;

-- 5. Recreate Policies (Based on Security Hardening + Fixes)

-- USERS
CREATE POLICY "Users view own or tenant" ON public.users
FOR SELECT USING (
  auth_id = auth.uid() OR 
  tenant_id = get_my_tenant_id()
);

-- STUDENT PROFILES
CREATE POLICY "Tenant access profiles" ON public.student_profiles
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- CLASSROOMS
CREATE POLICY "Tenant access classrooms" ON public.classrooms
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- EXAMS
CREATE POLICY "Tenant access exams" ON public.exams
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- EXAM QUESTIONS
CREATE POLICY "Tenant access questions" ON public.exam_questions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id AND e.tenant_id = get_my_tenant_id()
  )
);

-- EXAM SUBMISSIONS
CREATE POLICY "Teacher view submissions" ON public.exam_submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id AND e.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() = 'Teacher'
);

CREATE POLICY "Student view own submissions" ON public.exam_submissions
FOR SELECT USING (
  student_id IN (
    SELECT id FROM public.student_profiles WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Student create submissions" ON public.exam_submissions
FOR INSERT WITH CHECK (
  student_id IN (
    SELECT id FROM public.student_profiles WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  )
);

-- HOMEWORK
CREATE POLICY "Tenant access homework" ON public.homework
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- HOMEWORK SUBMISSIONS
CREATE POLICY "Tenant access homework submissions" ON public.homework_submissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.homework h
    WHERE h.id = homework_id AND h.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary')
);

CREATE POLICY "Student access homework submissions" ON public.homework_submissions
FOR ALL USING (
  student_id IN (
    SELECT id FROM public.student_profiles WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  )
);

-- ATTENDANCE
CREATE POLICY "Admin manage attendance" ON public.attendance_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = student_id AND s.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary')
);

-- FINANCIAL
CREATE POLICY "Admin manage finance" ON public.financial_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = student_id AND s.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary')
);

-- BEHAVIOR
CREATE POLICY "Admin manage behavior" ON public.behavior_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = student_id AND s.tenant_id = get_my_tenant_id()
  )
  AND get_my_role() IN ('Teacher', 'Secretary')
);

-- VIDEO & LIVE SESSIONS
CREATE POLICY "Tenant access videos" ON public.video_lessons
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

CREATE POLICY "Tenant access live sessions" ON public.live_sessions
FOR ALL USING (
  tenant_id = get_my_tenant_id()
);

-- ACTIVITY LOGS
CREATE POLICY "Users can view logs of their tenant" ON public.activity_logs
FOR SELECT USING (
  tenant_id = get_my_tenant_id()
);

-- NOTIFICATIONS
CREATE POLICY "Users manage own notifications" ON public.notifications
FOR ALL USING (
  user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
);

-- 6. Re-create create_student_user_v2 (Ensures it exists)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT oid::regprocedure AS func_signature
             FROM pg_proc
             WHERE proname = 'create_student_user_v2'
             AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_student_user_v2(
    p_name text,
    p_username text,
    p_password text,
    p_grade text,
    p_level text,
    p_parent_access_code text,
    p_dob date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id uuid;
  v_email text;
BEGIN
  -- Construct email from username
  v_email := p_username || '@student.local';

  -- Check if user exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = v_email) THEN
    RAISE EXCEPTION 'User with this username already exists';
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', p_name, 'role', 'Student', 'username', p_username),
    now(),
    now(),
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Create public profile
  INSERT INTO public.users (id, name, email, role, created_at)
  VALUES (new_user_id, p_name, v_email, 'Student', now());

  -- Create student profile
  INSERT INTO public.student_profiles (
    id, 
    student_code, 
    grade, 
    level,
    parent_access_code,
    dob
  )
  VALUES (
    new_user_id, 
    p_username, -- Using username as student_code
    p_grade, 
    p_level,
    p_parent_access_code,
    p_dob
  );

  RETURN new_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO service_role;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO anon;

-- 7. Refresh schema cache
NOTIFY pgrst, 'reload config';
