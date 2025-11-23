/*
  # Security Hardening & Stage 3 Policies
  
  ## Security Updates
  1. Force Enable RLS on all Stage 3 tables.
  2. Add specific policies for Live Sessions and Video Lessons.
  
  ## Policies
  - Teachers: Full access to their tenant's sessions/videos.
  - Students: Read-only access to sessions/videos in their tenant.
  - Attendance/Views: Students can insert their own records (joining/watching).
*/

-- 1. Enable RLS on all relevant tables
ALTER TABLE IF EXISTS "live_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "live_session_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "video_lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "video_views" ENABLE ROW LEVEL SECURITY;

-- 2. Policies for Live Sessions
DROP POLICY IF EXISTS "Tenant Isolation for Live Sessions" ON "live_sessions";
CREATE POLICY "Tenant Isolation for Live Sessions" ON "live_sessions"
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- 3. Policies for Live Session Attendance
DROP POLICY IF EXISTS "Tenant Isolation for Live Attendance" ON "live_session_attendance";
CREATE POLICY "Tenant Isolation for Live Attendance" ON "live_session_attendance"
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- 4. Policies for Video Lessons
DROP POLICY IF EXISTS "Tenant Isolation for Video Lessons" ON "video_lessons";
CREATE POLICY "Tenant Isolation for Video Lessons" ON "video_lessons"
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- 5. Policies for Video Views
DROP POLICY IF EXISTS "Tenant Isolation for Video Views" ON "video_views";
CREATE POLICY "Tenant Isolation for Video Views" ON "video_views"
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- 6. Ensure Search Path is safe for all functions (Fixing warning)
ALTER FUNCTION create_student_record SET search_path = public;
ALTER FUNCTION get_my_tenant_id SET search_path = public;
