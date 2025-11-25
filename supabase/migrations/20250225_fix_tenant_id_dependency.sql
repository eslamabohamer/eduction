-- 1. Enable pgcrypto in extensions schema (Best Practice)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. Drop Dependent Policies (To allow column type change)
-- Classrooms
DROP POLICY IF EXISTS "Users can view classrooms of their tenant" ON public.classrooms;
DROP POLICY IF EXISTS "Teachers can manage classrooms of their tenant" ON public.classrooms;
DROP POLICY IF EXISTS "Admins can manage all classrooms" ON public.classrooms;

-- Users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- Students
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
DROP POLICY IF EXISTS "Teachers can view students in their tenant" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;

-- Activity Logs
DROP POLICY IF EXISTS "Users can view logs of their tenant" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.activity_logs;

-- 3. Convert tenant_id to TEXT
DO $$
BEGIN
    -- users table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.users ALTER COLUMN tenant_id TYPE text;
    END IF;

    -- students table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.students ALTER COLUMN tenant_id TYPE text;
    END IF;

    -- activity_logs table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.activity_logs ALTER COLUMN tenant_id TYPE text;
    END IF;

    -- classrooms table (Since it was mentioned in the error)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classrooms' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.classrooms ALTER COLUMN tenant_id TYPE text;
    END IF;
END $$;

-- 4. Re-create Policies (Simplified for now to get things working)
-- Classrooms
CREATE POLICY "Users can view classrooms of their tenant" ON public.classrooms
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Students
CREATE POLICY "Students can view their own profile" ON public.students
    FOR SELECT USING (auth.uid() = id);

-- Activity Logs
CREATE POLICY "Users can view logs of their tenant" ON public.activity_logs
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));


-- 5. Drop ALL existing versions of create_student_user_v2 (Cleanup)
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

-- 6. Re-create the function (Ensures it exists and works with text tenant_id)
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
  INSERT INTO public.students (
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

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO service_role;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO anon;

-- 8. Refresh schema cache
NOTIFY pgrst, 'reload config';
