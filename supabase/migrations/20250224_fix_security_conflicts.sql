/*
  # Security Hardening & Conflict Fix
  
  ## Query Description:
  1. Fixes "Policy already exists" errors by dropping them first.
  2. Fixes "Function search_path mutable" warnings by setting search_path.
  3. Fixes "RLS Disabled" errors by enabling RLS on all tables.
  4. Implements strict Role-Based Access Control (RBAC) for Secretary vs Teacher.
  
  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Fix Functions (Search Path & Return Types)
-- Drop potentially conflicting functions first
DROP FUNCTION IF EXISTS create_student_record(text, text, text, text, text);
DROP FUNCTION IF EXISTS get_my_tenant_id();

-- Recreate get_my_tenant_id with secure search_path
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Recreate create_student_record with secure search_path
CREATE OR REPLACE FUNCTION create_student_record(
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
  v_user_id uuid;
  v_profile_id uuid;
  v_tenant_id uuid;
  v_teacher_role text;
BEGIN
  -- Check if requester is Teacher or Secretary
  SELECT tenant_id, role INTO v_tenant_id, v_teacher_role
  FROM users
  WHERE auth_id = auth.uid();

  IF v_tenant_id IS NULL OR (v_teacher_role NOT IN ('Teacher', 'Secretary')) THEN
    RAISE EXCEPTION 'Unauthorized: Only Teachers or Secretaries can add students';
  END IF;

  -- 1. Create entry in public.users (Simulating auth user creation for this demo)
  -- In a real app, this would be linked to auth.users via a trigger or Edge Function
  INSERT INTO users (auth_id, name, role, tenant_id, username)
  VALUES (gen_random_uuid(), p_name, 'Student', v_tenant_id, p_username)
  RETURNING id INTO v_user_id;

  -- 2. Create Student Profile
  INSERT INTO student_profiles (user_id, student_code, grade, level, tenant_id)
  VALUES (
    v_user_id,
    -- Generate a random 6-digit code
    (FLOOR(RANDOM() * 900000 + 100000)::text),
    p_grade,
    p_level,
    v_tenant_id
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

-- 2. Enable RLS on ALL Tables (Fixes "RLS Disabled" Advisory)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Clean up & Re-apply Policies (Fixes "Policy already exists" Error)

-- Helper macro to drop policies if they exist (Postgres doesn't have IF EXISTS for policies in all versions easily, so we do blocks)
DO $$ 
BEGIN
    -- Users Table
    DROP POLICY IF EXISTS "Users view own tenant" ON users;
    DROP POLICY IF EXISTS "Users update own profile" ON users;
    
    -- Student Profiles
    DROP POLICY IF EXISTS "View profiles in tenant" ON student_profiles;
    DROP POLICY IF EXISTS "Manage profiles in tenant" ON student_profiles;
    
    -- Attendance
    DROP POLICY IF EXISTS "Secretary manage attendance" ON attendance_records;
    DROP POLICY IF EXISTS "Teacher manage attendance" ON attendance_records;
    DROP POLICY IF EXISTS "Student view attendance" ON attendance_records;
    
    -- Financial
    DROP POLICY IF EXISTS "Secretary manage finance" ON financial_records;
    DROP POLICY IF EXISTS "Teacher manage finance" ON financial_records;
    DROP POLICY IF EXISTS "Student view finance" ON financial_records;

    -- Behavior
    DROP POLICY IF EXISTS "Secretary manage behavior" ON behavior_notes;
    DROP POLICY IF EXISTS "Teacher manage behavior" ON behavior_notes;
    DROP POLICY IF EXISTS "Student view behavior" ON behavior_notes;

    -- Exams (Sensitive)
    DROP POLICY IF EXISTS "View exams in tenant" ON exams;
    DROP POLICY IF EXISTS "Manage exams in tenant" ON exams;
    
    -- Exam Submissions (Very Sensitive)
    DROP POLICY IF EXISTS "Student manage own submissions" ON exam_submissions;
    DROP POLICY IF EXISTS "Teacher view all submissions" ON exam_submissions;
    -- Note: We intentionally DO NOT create a policy for Secretary here
END $$;

-- --- RE-CREATE POLICIES ---

-- Users
CREATE POLICY "Users view own tenant" ON users
FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Users update own profile" ON users
FOR UPDATE USING (auth_id = auth.uid());

-- Student Profiles (Secretary & Teacher have full access)
CREATE POLICY "View profiles in tenant" ON student_profiles
FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Manage profiles in tenant" ON student_profiles
FOR ALL USING (
  tenant_id = get_my_tenant_id() AND 
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Teacher', 'Secretary'))
);

-- Attendance (Secretary & Teacher have full access)
CREATE POLICY "Staff manage attendance" ON attendance_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = attendance_records.student_id AND sp.tenant_id = get_my_tenant_id()
  ) AND
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Teacher', 'Secretary'))
);

CREATE POLICY "Student view attendance" ON attendance_records
FOR SELECT USING (
  student_id IN (SELECT id FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
);

-- Financial (Secretary & Teacher have full access)
CREATE POLICY "Staff manage finance" ON financial_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = financial_records.student_id AND sp.tenant_id = get_my_tenant_id()
  ) AND
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Teacher', 'Secretary'))
);

CREATE POLICY "Student view finance" ON financial_records
FOR SELECT USING (
  student_id IN (SELECT id FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
);

-- Behavior (Secretary & Teacher have full access)
CREATE POLICY "Staff manage behavior" ON behavior_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = behavior_notes.student_id AND sp.tenant_id = get_my_tenant_id()
  ) AND
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Teacher', 'Secretary'))
);

CREATE POLICY "Student view behavior" ON behavior_notes
FOR SELECT USING (
  student_id IN (SELECT id FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
);

-- Exams (Secretary can View/Create schedules, but NOT see grades)
CREATE POLICY "View exams in tenant" ON exams
FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Manage exams in tenant" ON exams
FOR ALL USING (
  tenant_id = get_my_tenant_id() AND 
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Teacher', 'Secretary'))
);

-- Exam Submissions (GRADES - STRICT RESTRICTION)
-- Only Student (Own) and Teacher (All) can see. Secretary CANNOT.
CREATE POLICY "Student manage own submissions" ON exam_submissions
FOR ALL USING (
  student_id IN (SELECT id FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
);

CREATE POLICY "Teacher view all submissions" ON exam_submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM exams e
    WHERE e.id = exam_submissions.exam_id AND e.tenant_id = get_my_tenant_id()
  ) AND
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Teacher') -- Only Teacher!
);
