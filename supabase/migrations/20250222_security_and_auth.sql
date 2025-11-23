/*
  # Security Fixes & Auth Automation
  
  ## Security Updates:
  - Enables RLS on ALL public tables to fix security advisories.
  - Updates functions to use 'security definer' and fixed 'search_path'.
  
  ## Auth Automation:
  - Adds a trigger on auth.users to automatically create:
    1. A new Tenant (if the user is registering a new organization).
    2. A new User profile linked to that Tenant.
    
  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: false
*/

-- 1. Fix Function Search Paths (Security Advisory)
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
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN v_tenant_id;
END;
$$;

-- 2. Enable RLS on all tables (Security Advisory)
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_submissions ENABLE ROW LEVEL SECURITY;
-- Add other tables if they exist from previous migrations, or ensure they are covered when created.

-- 3. Auth Trigger for New Tenant Registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_tenant_name text;
  v_tenant_type text;
  v_role text;
  v_name text;
BEGIN
  -- Extract metadata
  v_tenant_name := new.raw_user_meta_data->>'tenant_name';
  v_tenant_type := new.raw_user_meta_data->>'tenant_type';
  v_role := new.raw_user_meta_data->>'role';
  v_name := new.raw_user_meta_data->>'name';

  -- Scenario A: New Tenant Registration (Teacher/Admin signing up)
  IF v_tenant_name IS NOT NULL THEN
    -- 1. Create Tenant
    INSERT INTO public.tenants (name, type)
    VALUES (v_tenant_name, COALESCE(v_tenant_type, 'individual'))
    RETURNING id INTO v_tenant_id;

    -- 2. Create User Profile linked to new Tenant
    INSERT INTO public.users (id, email, name, role, tenant_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(v_name, split_part(new.email, '@', 1)), 
      COALESCE(v_role, 'Teacher'), 
      v_tenant_id
    );
  
  -- Scenario B: Invited User (Student/Teacher created by existing Admin)
  -- In this case, tenant_id should be passed in metadata or handled by the inviter API.
  -- For now, we'll handle the case where tenant_id is explicitly passed.
  ELSIF new.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    INSERT INTO public.users (id, email, name, role, tenant_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(v_name, split_part(new.email, '@', 1)), 
      COALESCE(v_role, 'Student'), 
      (new.raw_user_meta_data->>'tenant_id')::uuid
    );
  END IF;

  RETURN new;
END;
$$;

-- Recreate Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
