-- 1. Enable pgcrypto (Just in case)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. Convert tenant_id to TEXT for flexibility (Fixes type mismatch error)
-- We use DO block to handle tables that might not exist or columns that might be missing
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
    
    -- Add other tables if necessary, but these are the core ones involved in creation
END $$;

-- 3. Drop ALL existing versions of create_student_user_v2 (Cleanup)
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

-- 4. Re-create the function (Ensures it exists)
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

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO service_role;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO anon;

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload config';
