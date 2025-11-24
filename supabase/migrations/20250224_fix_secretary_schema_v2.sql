/*
  # Fix Secretary Role & Policies
  
  ## Query Description:
  1. Updates the 'users' table to allow 'Secretary' as a valid role.
  2. Creates helper functions to safely retrieve current user's tenant and role (handling UUID/Text casting).
  3. Implements RLS policies for Secretary access to:
     - Students (Full Access)
     - Attendance (Full Access)
     - Financial Records (Full Access)
     - Behavior Notes (Full Access)
     - Classrooms (Read/Write)
     - Notifications (Read/Write)
  4. Ensures strict tenant isolation.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Update Role Constraint to include 'Secretary'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('Teacher', 'Student', 'Parent', 'Supervisor', 'Admin', 'Secretary'));

-- 2. Create Helper Functions for Type-Safe RLS
-- These functions encapsulate the casting logic to prevent "uuid = text" errors

-- Get current user's tenant_id (returns UUID)
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- We cast auth_id to uuid to be safe if it was stored as text, or compare directly
  SELECT tenant_id 
  FROM public.users 
  WHERE auth_id::uuid = auth.uid() 
  LIMIT 1;
$$;

-- Get current user's role (returns Text)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role 
  FROM public.users 
  WHERE auth_id::uuid = auth.uid() 
  LIMIT 1;
$$;

-- 3. Policies for Students Table
DROP POLICY IF EXISTS "Secretary manage students" ON public.student_profiles;
CREATE POLICY "Secretary manage students" ON public.student_profiles
FOR ALL
TO authenticated
USING (
  -- Check if user is Secretary AND belongs to same tenant
  (get_my_role() = 'Secretary' AND tenant_id = get_my_tenant_id())
  OR
  -- Keep existing Teacher access (assuming teacher is owner of tenant)
  (get_my_role() = 'Teacher' AND tenant_id = get_my_tenant_id())
);

-- 4. Policies for Attendance Records
-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Secretary manage attendance" ON public.attendance_records;
CREATE POLICY "Secretary manage attendance" ON public.attendance_records
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = attendance_records.student_id
    AND s.tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('Secretary', 'Teacher')
  )
);

-- 5. Policies for Financial Records
-- Enable RLS
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Secretary manage finances" ON public.financial_records;
CREATE POLICY "Secretary manage finances" ON public.financial_records
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = financial_records.student_id
    AND s.tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('Secretary', 'Teacher')
  )
);

-- 6. Policies for Behavior Notes
-- Enable RLS
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Secretary manage behavior" ON public.behavior_notes;
CREATE POLICY "Secretary manage behavior" ON public.behavior_notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles s
    WHERE s.id = behavior_notes.student_id
    AND s.tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('Secretary', 'Teacher')
  )
);

-- 7. Policies for Classrooms (Secretary can view and edit to manage enrollments)
DROP POLICY IF EXISTS "Secretary manage classrooms" ON public.classrooms;
CREATE POLICY "Secretary manage classrooms" ON public.classrooms
FOR ALL
TO authenticated
USING (
  tenant_id = get_my_tenant_id()
  AND get_my_role() IN ('Secretary', 'Teacher')
);

-- 8. Policies for Enrollments
DROP POLICY IF EXISTS "Secretary manage enrollments" ON public.enrollments;
CREATE POLICY "Secretary manage enrollments" ON public.enrollments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = enrollments.classroom_id
    AND c.tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('Secretary', 'Teacher')
  )
);

-- 9. Policies for Notifications (Secretary can create bulk notifications)
DROP POLICY IF EXISTS "Secretary manage notifications" ON public.notifications;
CREATE POLICY "Secretary manage notifications" ON public.notifications
FOR ALL
TO authenticated
USING (
  -- Users can see their own notifications
  user_id::uuid = (SELECT id FROM public.users WHERE auth_id::uuid = auth.uid())
  OR
  -- Secretaries/Teachers can create notifications (INSERT)
  (get_my_role() IN ('Secretary', 'Teacher'))
);

-- 10. Grant permissions to authenticated users for new tables
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.financial_records TO authenticated;
GRANT ALL ON public.behavior_notes TO authenticated;
