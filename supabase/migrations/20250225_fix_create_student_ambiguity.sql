-- Fix ambiguous function signature for create_student_record
-- and ensure date_of_birth is actually saved.

-- 1. Drop the OLD signature that causes ambiguity (PostgREST sees date string and gets confused)
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, date);

-- 2. Drop the NEW signature to recreate it with the fix for using p_dob
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, text);

-- 3. Recreate the function with correct logic
CREATE OR REPLACE FUNCTION public.create_student_record(
  p_name text,
  p_username text,
  p_grade text,
  p_level text,
  p_dob text DEFAULT NULL
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
  v_student_code text;
  v_role text;
BEGIN
  -- Get tenant_id and role of the creator
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a tenant';
  END IF;

  IF v_role NOT IN ('Teacher', 'Secretary', 'Admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only Teachers, Secretaries or Admins can add students';
  END IF;

  -- Generate a mock auth_id (In production, use real Auth API)
  v_user_id := gen_random_uuid();
  
  -- Generate Student Code (Random 6 chars)
  v_student_code := upper(substring(md5(random()::text) from 1 for 6));

  -- Insert into users
  INSERT INTO public.users (auth_id, name, username, role, tenant_id)
  VALUES (v_user_id, p_name, p_username, 'Student', v_tenant_id);

  -- Insert into student_profiles
  INSERT INTO public.student_profiles (
    user_id, 
    tenant_id, 
    grade, 
    level, 
    student_code,
    date_of_birth
  )
  VALUES (
    v_user_id, 
    v_tenant_id, 
    p_grade, 
    p_level, 
    v_student_code,
    CASE WHEN p_dob IS NOT NULL AND p_dob != '' THEN p_dob::date ELSE NULL END
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;
