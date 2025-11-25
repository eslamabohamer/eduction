-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Re-create create_student_user function with robust error handling
CREATE OR REPLACE FUNCTION public.create_student_user(
    email text,
    password text,
    name text,
    student_code text,
    grade text,
    level text,
    parent_name text,
    parent_phone text,
    address text,
    emergency_contact text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = create_student_user.email) THEN
    RAISE EXCEPTION 'User with this email already exists';
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
    email,
    crypt(password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', name, 'role', 'Student'),
    now(),
    now(),
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Create public profile
  INSERT INTO public.users (id, name, email, role, created_at)
  VALUES (new_user_id, name, email, 'Student', now());

  -- Create student profile
  INSERT INTO public.students (
    id, 
    student_code, 
    grade, 
    level, 
    parent_name, 
    parent_phone, 
    address, 
    emergency_contact
  )
  VALUES (
    new_user_id, 
    student_code, 
    grade, 
    level, 
    parent_name, 
    parent_phone, 
    address, 
    emergency_contact
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
