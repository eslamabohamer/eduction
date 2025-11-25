-- Migration to resolve function ambiguity for student creation
-- This drops conflicting function signatures and recreates a single authoritative version

-- 1. Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Drop existing ambiguous functions
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, date);
DROP FUNCTION IF EXISTS public.create_student_user(text, text, text, text, text, text, date);
DROP FUNCTION IF EXISTS public.create_student_user(text, text, text, text, text, text, text);

-- 3. Recreate the internal function to handle user creation securely
-- Note: This function creates a user in auth.users and links it to a student profile
CREATE OR REPLACE FUNCTION public.create_student_user(
  p_name text,
  p_username text,
  p_password text,
  p_grade text,
  p_level text,
  p_parent_access_code text,
  p_dob date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Required to access auth.users and perform privileged actions
SET search_path = public, auth, extensions -- Set search path for security
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_tenant_id uuid;
BEGIN
  -- Get the tenant_id from the current creator (Teacher/Admin)
  SELECT tenant_id INTO v_tenant_id FROM public.users WHERE id = auth.uid();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Current user does not belong to a tenant';
  END IF;

  -- Generate a dummy email based on username (required for auth.users)
  v_email := p_username || '@student.local';

  -- Check if username already exists (via email check)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;

  -- Insert into auth.users
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
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')), -- Hash password
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'name', p_name, 
      'role', 'Student', 
      'username', p_username,
      'tenant_id', v_tenant_id
    ),
    now(),
    now()
  )
  RETURNING id INTO v_user_id;

  -- Insert into public.users (if not handled by a trigger)
  -- We use ON CONFLICT DO NOTHING in case a trigger already created it
  INSERT INTO public.users (id, name, email, username, role, tenant_id)
  VALUES (v_user_id, p_name, v_email, p_username, 'Student', v_tenant_id)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    role = 'Student',
    tenant_id = v_tenant_id;

  -- Insert into student_profiles
  INSERT INTO public.student_profiles (
    user_id,
    student_code,
    grade,
    level,
    tenant_id
  ) VALUES (
    v_user_id,
    upper(substring(md5(random()::text) from 1 for 8)), -- Generate random 8-char code
    p_grade,
    p_level,
    v_tenant_id
  );

  RETURN v_user_id;
END;
$$;

-- 4. Recreate the wrapper function called by the Frontend RPC
CREATE OR REPLACE FUNCTION public.create_student_record(
  p_name text,
  p_username text,
  p_grade text,
  p_level text,
  p_dob date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  -- Call the internal function with a default password
  -- You might want to make this configurable or random in the future
  v_student_id := public.create_student_user(
    p_name,
    p_username,
    '123456', -- Default password for new students
    p_grade,
    p_level,
    NULL, -- No parent code initially
    p_dob
  );

  RETURN json_build_object('id', v_student_id, 'success', true);
END;
$$;
