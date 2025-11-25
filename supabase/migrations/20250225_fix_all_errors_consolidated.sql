-- 1. Enable pgcrypto for password hashing (Fixes gen_salt error)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Fix Activity Logs Relationship (Fixes 400 Bad Request)
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- 3. Drop ALL existing versions of create_student_user to avoid ambiguity
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT oid::regprocedure AS func_signature
             FROM pg_proc
             WHERE proname = 'create_student_user'
             AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature;
    END LOOP;
END $$;

-- 4. Re-create create_student_user function with FRONTEND MATCHING SIGNATURE
-- Frontend calls: p_name, p_username, p_password, p_grade, p_level, p_parent_access_code, p_dob
CREATE OR REPLACE FUNCTION public.create_student_user(
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
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  v_email text;
BEGIN
  -- Construct email from username (since we use email auth)
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
    p_username, -- Using username as student_code initially
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
GRANT EXECUTE ON FUNCTION public.create_student_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_user TO service_role;
GRANT EXECUTE ON FUNCTION public.create_student_user TO anon;

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload config';
