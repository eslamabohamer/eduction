-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add parent_access_code to student_profiles
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS parent_access_code TEXT;

-- Function to create a real Supabase Auth user for students
-- This bypasses the need for an Edge Function by inserting directly into auth.users
-- WARNING: This requires the postgres role to have permissions on auth.users (usually true for migrations)
CREATE OR REPLACE FUNCTION public.create_student_user(
  p_name text,
  p_username text,
  p_password text,
  p_grade text,
  p_level text,
  p_parent_access_code text,
  p_dob text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_profile_id uuid;
  v_student_code text;
  v_email text;
  v_encrypted_pw text;
BEGIN
  -- 1. Get tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a tenant';
  END IF;

  -- 2. Generate Email and Password Hash
  v_email := p_username || '@edu.local';
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));
  v_user_id := gen_random_uuid();
  
  -- 3. Generate Student Code
  v_student_code := upper(substring(md5(random()::text) from 1 for 6));

  -- 4. Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Default instance_id
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    NOW(), -- Auto confirm
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', p_name, 'role', 'Student'),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- 5. Insert into public.users
  INSERT INTO public.users (auth_id, name, username, role, tenant_id)
  VALUES (v_user_id, p_name, p_username, 'Student', v_tenant_id);

  -- 6. Insert into student_profiles
  INSERT INTO public.student_profiles (
    user_id, 
    tenant_id, 
    grade, 
    level, 
    student_code,
    date_of_birth,
    parent_access_code
  )
  VALUES (
    v_user_id, 
    v_tenant_id, 
    p_grade, 
    p_level, 
    v_student_code,
    CASE WHEN p_dob IS NOT NULL AND p_dob != '' THEN p_dob::date ELSE NULL END,
    p_parent_access_code
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;
