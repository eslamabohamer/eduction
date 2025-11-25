/*
  # Fix Function Signature & Harden Security
  
  1. DROPS existing `create_student_record` to avoid return type conflicts.
  2. RECREATES `create_student_record` with secure `search_path`.
  3. SECURES `get_my_tenant_id` with secure `search_path`.
  4. ENABLES RLS on all application tables.
*/

-- 1. Fix create_student_record by dropping first (handles signature changes)
DROP FUNCTION IF EXISTS create_student_record(text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_student_record(
  p_name text,
  p_username text,
  p_grade text,
  p_level text,
  p_dob text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  new_student_id uuid;
  my_tenant_id uuid;
  generated_code text;
BEGIN
  -- Get tenant_id from current user
  SELECT tenant_id INTO my_tenant_id
  FROM users
  WHERE auth_id = auth.uid();

  IF my_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a tenant';
  END IF;

  -- Generate a random student code (6 chars)
  generated_code := upper(substring(md5(random()::text) from 1 for 6));

  -- Create the user record (Shadow user for student)
  -- Note: This creates a record in public.users. 
  -- The actual auth.users account might be created later or this is a managed account.
  INSERT INTO users (
    name, 
    username, 
    role, 
    tenant_id
  )
  VALUES (
    p_name, 
    p_username, 
    'Student', 
    my_tenant_id
  )
  RETURNING id INTO new_user_id;

  -- Create the student profile
  INSERT INTO student_profiles (
    user_id, 
    grade, 
    level, 
    tenant_id, 
    student_code
  )
  VALUES (
    new_user_id, 
    p_grade, 
    p_level, 
    my_tenant_id, 
    generated_code
  )
  RETURNING id INTO new_student_id;

  RETURN new_student_id;
END;
$$;

-- 2. Fix get_my_tenant_id search_path warning
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 3. Enable RLS on all tables (Fixes "RLS Disabled" Security Advisories)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS behavior_notes ENABLE ROW LEVEL SECURITY;
