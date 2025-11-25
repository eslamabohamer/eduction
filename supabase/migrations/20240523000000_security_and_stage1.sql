/*
  # Security Fixes & Stage 1 Schema
  
  ## Security Updates
  - Enable RLS on all tables (tenants, users, student_profiles, classrooms, enrollments).
  - Fix function search_paths.
  
  ## Stage 1 Schema
  - Ensure `classrooms` table exists.
  - Ensure `enrollments` table exists.
  - Add `create_student_profile` function for teachers to create students safely.
*/

-- 1. Enable RLS on all tables (Addressing Security Advisories)
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Create Classrooms table if not exists
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT,
    grade TEXT,
    teacher_id UUID REFERENCES public.users(id),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Create Enrollments table if not exists
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.student_profiles(id),
    classroom_id UUID REFERENCES public.classrooms(id),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, classroom_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 2. Fix Function Search Paths (Addressing Security Advisories)
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM public.users
    WHERE id = auth.uid();
    RETURN v_tenant_id;
END;
$$;

-- 3. RLS Policies (Ensure they exist and are correct)

-- Classrooms Policies
DROP POLICY IF EXISTS "Teachers can view their own classrooms" ON public.classrooms;
CREATE POLICY "Teachers can view their own classrooms" ON public.classrooms
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- Enrollments Policies
DROP POLICY IF EXISTS "Teachers can view enrollments" ON public.enrollments;
CREATE POLICY "Teachers can view enrollments" ON public.enrollments
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- 4. Helper Function to Create Student (Securely)
-- This allows a Teacher to create a Student Profile. 
-- Note: Actual auth.users creation usually requires a secure edge function or admin API.
-- For this prototype, we create the public user/profile record.
CREATE OR REPLACE FUNCTION public.create_student_record(
    p_name TEXT,
    p_username TEXT,
    p_grade TEXT,
    p_level TEXT,
    p_dob DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_profile_id UUID;
    v_student_code TEXT;
BEGIN
    -- Get current teacher's tenant
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found for current user';
    END IF;

    -- Generate a pseudo-random ID for the user (since we aren't creating auth.users yet)
    v_user_id := gen_random_uuid();
    
    -- Generate unique student code (Simple timestamp + random suffix for demo)
    v_student_code := 'ST-' || floor(extract(epoch from now())) || '-' || floor(random() * 1000);

    -- Insert into public.users
    INSERT INTO public.users (id, name, username, role, tenant_id)
    VALUES (v_user_id, p_name, p_username, 'Student', v_tenant_id);

    -- Insert into student_profiles
    INSERT INTO public.student_profiles (user_id, student_code, grade, level, date_of_birth, tenant_id)
    VALUES (v_user_id, v_student_code, p_grade, p_level, p_dob, v_tenant_id)
    RETURNING id INTO v_profile_id;

    RETURN v_profile_id;
END;
$$;
