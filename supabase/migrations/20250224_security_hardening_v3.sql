/*
  # Security Hardening & Secretary Access Fixes
  
  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
  
  ## Changes:
  1. Force Enable RLS on ALL tables to clear security advisories.
  2. Fix 'search_path' warnings for critical functions.
  3. Add missing policies for Secretary role on new modules (Attendance, Finance, Behavior).
*/

-- 1. Fix Functions (Search Path Mutable Warnings)
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM users
  WHERE auth_id = auth.uid();
  
  RETURN v_tenant_id;
END;
$$;

-- Drop old function signature to avoid conflicts
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, text);

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
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_profile_id uuid;
  v_student_code text;
BEGIN
  -- Get tenant_id of the creator
  v_tenant_id := get_my_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a tenant';
  END IF;

  -- Generate a mock auth_id (In production, use real Auth API)
  v_user_id := gen_random_uuid();
  
  -- Generate Student Code
  v_student_code := floor(random() * (999999 - 100000 + 1) + 100000)::text;

  -- Insert into users
  INSERT INTO users (auth_id, name, username, role, tenant_id)
  VALUES (v_user_id, p_name, p_username, 'Student', v_tenant_id);

  -- Insert into student_profiles
  INSERT INTO student_profiles (user_id, tenant_id, grade, level, student_code)
  VALUES (v_user_id, v_tenant_id, p_grade, p_level, v_student_code)
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

-- 2. Force Enable RLS on ALL Tables (Critical Security Fix)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Add Policies for Secretary (Administrative Access)

-- Attendance Records
CREATE POLICY "Secretary manage attendance" ON attendance_records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = attendance_records.student_id
    AND sp.tenant_id = get_my_tenant_id()
  )
  AND (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Secretary')
  )
);

-- Financial Records
CREATE POLICY "Secretary manage finance" ON financial_records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = financial_records.student_id
    AND sp.tenant_id = get_my_tenant_id()
  )
  AND (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Secretary')
  )
);

-- Behavior Notes
CREATE POLICY "Secretary manage behavior" ON behavior_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = behavior_notes.student_id
    AND sp.tenant_id = get_my_tenant_id()
  )
  AND (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Secretary')
  )
);

-- Ensure Teachers also have access to these new tables
CREATE POLICY "Teacher manage attendance" ON attendance_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = attendance_records.student_id
    AND sp.tenant_id = get_my_tenant_id()
  )
  AND (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Teacher')
  )
);

CREATE POLICY "Teacher manage finance" ON financial_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = financial_records.student_id
    AND sp.tenant_id = get_my_tenant_id()
  )
  AND (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Teacher')
  )
);

CREATE POLICY "Teacher manage behavior" ON behavior_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = behavior_notes.student_id
    AND sp.tenant_id = get_my_tenant_id()
  )
  AND (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Teacher')
  )
);
