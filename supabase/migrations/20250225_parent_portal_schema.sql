/*
  # Parent Portal Schema & Security
  
  1. New Tables:
    - `parent_profiles`: Stores parent specific info, linked to `users`.
    - `messages`: For communication between Staff and Parents/Students.
    
  2. Schema Changes:
    - Add `parent_profile_id` to `student_profiles` to link students to parents.
    
  3. Security (RLS):
    - Policies for Parents to view their own profile.
    - Policies for Parents to view their children's data (Profiles, Attendance, Finance, Grades).
    - Policies for Messages.
*/

-- 1. Create Parent Profiles Table
CREATE TABLE IF NOT EXISTS parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(auth_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link Students to Parents
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS parent_profile_id UUID REFERENCES parent_profiles(id);

-- 3. Create Messages Table (Communication Center)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sender_id UUID NOT NULL REFERENCES users(auth_id),
  recipient_id UUID REFERENCES users(auth_id), -- Null means broadcast/group
  recipient_group TEXT, -- 'all_parents', 'all_students', 'classroom_x'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Helper function to get current parent profile id
CREATE OR REPLACE FUNCTION get_my_parent_profile_id()
RETURNS UUID AS $$
  SELECT id FROM parent_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Parent Profile Policies
CREATE POLICY "Parents view own profile" ON parent_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff view tenant parents" ON parent_profiles
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- Update Student Profile Policy for Parents
CREATE POLICY "Parents view own children" ON student_profiles
  FOR SELECT USING (parent_profile_id = get_my_parent_profile_id());

-- Attendance Policies for Parents
CREATE POLICY "Parents view children attendance" ON attendance_records
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM student_profiles 
      WHERE parent_profile_id = get_my_parent_profile_id()
    )
  );

-- Financial Policies for Parents
CREATE POLICY "Parents view children finance" ON financial_records
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM student_profiles 
      WHERE parent_profile_id = get_my_parent_profile_id()
    )
  );

-- Behavior Policies for Parents
CREATE POLICY "Parents view children behavior" ON behavior_notes
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM student_profiles 
      WHERE parent_profile_id = get_my_parent_profile_id()
    )
  );

-- Academic/Exam Policies for Parents
CREATE POLICY "Parents view children exam submissions" ON exam_submissions
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM student_profiles 
      WHERE parent_profile_id = get_my_parent_profile_id()
    )
  );

CREATE POLICY "Parents view children homework submissions" ON homework_submissions
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM student_profiles 
      WHERE parent_profile_id = get_my_parent_profile_id()
    )
  );

-- Message Policies
CREATE POLICY "Users view messages sent to them" ON messages
  FOR SELECT USING (
    recipient_id = auth.uid() OR sender_id = auth.uid()
  );

CREATE POLICY "Staff manage messages" ON messages
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- Function to link a student to a parent (Admin/Teacher only)
CREATE OR REPLACE FUNCTION link_student_to_parent(p_student_id UUID, p_parent_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_parent_profile_id UUID;
BEGIN
  -- Find parent profile by email (via users table)
  SELECT pp.id INTO v_parent_profile_id
  FROM parent_profiles pp
  JOIN users u ON pp.user_id = u.auth_id
  WHERE u.email = p_parent_email;

  IF v_parent_profile_id IS NULL THEN
    RAISE EXCEPTION 'Parent account not found';
  END IF;

  UPDATE student_profiles
  SET parent_profile_id = v_parent_profile_id
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
