/*
  # Add Secretary Role and Permissions
  Adds support for the 'Secretary' role with specific RLS policies.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true

  ## Security Implications:
  - Adds policies for 'Secretary' to manage students, attendance, and finance.
  - Explicitly does NOT grant access to 'exam_submissions' (Academic Data) to Secretary.
*/

-- 1. Update Policies for Student Profiles (Secretary can View/Edit/Create)
CREATE POLICY "Secretaries can view students in their tenant" ON "public"."student_profiles"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id' = tenant_id::text
  AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'Secretary'
);

CREATE POLICY "Secretaries can insert students" ON "public"."student_profiles"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id' = tenant_id::text
  AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'Secretary'
);

CREATE POLICY "Secretaries can update students" ON "public"."student_profiles"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id' = tenant_id::text
  AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'Secretary'
);

-- 2. Attendance Records (Full Access)
CREATE POLICY "Secretaries full access attendance" ON "public"."attendance_records"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = attendance_records.student_id
    AND sp.tenant_id = ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')
  )
  AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'Secretary'
);

-- 3. Financial Records (Full Access)
CREATE POLICY "Secretaries full access financials" ON "public"."financial_records"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = financial_records.student_id
    AND sp.tenant_id = ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')
  )
  AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'Secretary'
);

-- 4. Notifications (Can create)
CREATE POLICY "Secretaries can create notifications" ON "public"."notifications"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id' = tenant_id::text
  AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'Secretary'
);
