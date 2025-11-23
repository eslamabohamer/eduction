/*
  # Initial Schema Setup for Multi-tenant Education Platform
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - Tables: tenants, users, subscription_plans, subscriptions, student_profiles, classrooms, enrollments
  - Security: RLS enabled on all tables. Policies enforce tenant isolation.
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('individual', 'center', 'school')) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. USERS (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('Teacher', 'Student', 'Parent', 'Supervisor', 'Admin')) NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, username) -- Username unique per tenant
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for Tenants
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant" ON public.tenants
    FOR SELECT USING (id = public.get_my_tenant_id());

-- Policies for Users
DROP POLICY IF EXISTS "Users can view members of their tenant" ON public.users;
CREATE POLICY "Users can view members of their tenant" ON public.users
    FOR SELECT USING (tenant_id = public.get_my_tenant_id() OR id = auth.uid());

-- 3. STUDENT PROFILES
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    student_code TEXT NOT NULL,
    grade TEXT,
    level TEXT,
    date_of_birth DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, student_code)
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for student_profiles" ON public.student_profiles;
CREATE POLICY "Tenant isolation for student_profiles" ON public.student_profiles
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- 4. CLASSROOMS
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    grade TEXT,
    level TEXT,
    teacher_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for classrooms" ON public.classrooms;
CREATE POLICY "Tenant isolation for classrooms" ON public.classrooms
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- 5. ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    student_id UUID REFERENCES public.student_profiles(id),
    classroom_id UUID REFERENCES public.classrooms(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, classroom_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for enrollments" ON public.enrollments;
CREATE POLICY "Tenant isolation for enrollments" ON public.enrollments
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- 6. ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    student_id UUID REFERENCES public.student_profiles(id),
    classroom_id UUID REFERENCES public.classrooms(id),
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('present', 'absent', 'late')) NOT NULL,
    type TEXT DEFAULT 'regular',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for attendance" ON public.attendance_records;
CREATE POLICY "Tenant isolation for attendance" ON public.attendance_records
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- Trigger to handle new user creation (Optional but recommended for keeping public.users in sync if using Supabase Auth hooks, 
-- but for now we will handle user creation via API/Service layer manually to ensure tenant_id is set).
