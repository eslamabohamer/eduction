/*
  # Secure Student Management Modules
  
  ## Query Description:
  This migration enables Row Level Security (RLS) on the newly created tables for attendance, finance, and behavior.
  It adds policies to ensure:
  1. Teachers can manage records for students in their tenant.
  2. Students can view (but not edit) their own records.
  
  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
  
  ## Security Implications:
  - RLS Status: Enabled for attendance_records, financial_records, behavior_notes.
  - Policy Changes: Yes, adding policies for Teachers and Students.
*/

-- 1. Secure Attendance Records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage attendance" ON attendance_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      JOIN users ON users.tenant_id = student_profiles.tenant_id
      WHERE student_profiles.id = attendance_records.student_id
      AND users.auth_id = auth.uid()
      AND users.role = 'Teacher'
    )
  );

CREATE POLICY "Students can view own attendance" ON attendance_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      WHERE student_profiles.id = attendance_records.student_id
      AND student_profiles.user_id = auth.uid()
    )
  );

-- 2. Secure Financial Records
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage financials" ON financial_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      JOIN users ON users.tenant_id = student_profiles.tenant_id
      WHERE student_profiles.id = financial_records.student_id
      AND users.auth_id = auth.uid()
      AND users.role = 'Teacher'
    )
  );

CREATE POLICY "Students can view own financials" ON financial_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      WHERE student_profiles.id = financial_records.student_id
      AND student_profiles.user_id = auth.uid()
    )
  );

-- 3. Secure Behavior Notes
ALTER TABLE behavior_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage behavior" ON behavior_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      JOIN users ON users.tenant_id = student_profiles.tenant_id
      WHERE student_profiles.id = behavior_notes.student_id
      AND users.auth_id = auth.uid()
      AND users.role = 'Teacher'
    )
  );

CREATE POLICY "Students can view own behavior" ON behavior_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      WHERE student_profiles.id = behavior_notes.student_id
      AND student_profiles.user_id = auth.uid()
    )
  );
