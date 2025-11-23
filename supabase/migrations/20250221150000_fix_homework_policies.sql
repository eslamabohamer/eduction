/*
  # Fix Homework Policies & Security Sweep
  
  ## Query Description:
  1. Drops existing policies to prevent conflicts (Fixes ERROR 42710).
  2. Re-applies strict RLS for Homework and Submissions.
  3. Ensures all tables have RLS enabled.
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Enable RLS on all relevant tables
ALTER TABLE IF EXISTS homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- 2. Homework Policies (Drop first to fix error)
DROP POLICY IF EXISTS "Teachers can manage homework" ON homework;
DROP POLICY IF EXISTS "Students can view homework for their classes" ON homework;

CREATE POLICY "Teachers can manage homework" ON homework
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Teacher', 'Admin', 'Supervisor')
      AND users.tenant_id = homework.tenant_id
    )
  );

CREATE POLICY "Students can view homework for their classes" ON homework
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN student_profiles sp ON sp.id = e.student_id
      WHERE sp.user_id = auth.uid()
      AND e.classroom_id = homework.classroom_id
    )
  );

-- 3. Homework Submission Policies
DROP POLICY IF EXISTS "Teachers can view submissions" ON homework_submissions;
DROP POLICY IF EXISTS "Students can manage own submissions" ON homework_submissions;
DROP POLICY IF EXISTS "Students can view own submissions" ON homework_submissions; -- Drop the specific one causing error

CREATE POLICY "Teachers can view submissions" ON homework_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Teacher', 'Admin', 'Supervisor')
      AND users.tenant_id = homework_submissions.tenant_id
    )
  );

-- Allow teachers to grade (UPDATE)
CREATE POLICY "Teachers can grade submissions" ON homework_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Teacher', 'Admin', 'Supervisor')
      AND users.tenant_id = homework_submissions.tenant_id
    )
  );

CREATE POLICY "Students can manage own submissions" ON homework_submissions
  FOR ALL
  USING (
    student_id IN (
      SELECT id FROM student_profiles WHERE user_id = auth.uid()
    )
  );

-- 4. Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR ALL
  USING (user_id = auth.uid());

-- 5. Fix Search Path for Functions (Security Best Practice)
CREATE OR REPLACE FUNCTION notify_students_on_homework()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (id, user_id, title, body, type, related_type, related_id, tenant_id)
  SELECT 
    gen_random_uuid(),
    u.id,
    'واجب جديد: ' || NEW.title,
    'تم إضافة واجب جديد في فصل ' || c.name || '. موعد التسليم: ' || NEW.due_date,
    'info',
    'Homework',
    NEW.id,
    NEW.tenant_id
  FROM enrollments e
  JOIN student_profiles sp ON sp.id = e.student_id
  JOIN users u ON u.id = sp.user_id
  JOIN classrooms c ON c.id = NEW.classroom_id
  WHERE e.classroom_id = NEW.classroom_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
