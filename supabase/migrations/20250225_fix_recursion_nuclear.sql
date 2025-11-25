-- NUCLEAR FIX for Infinite Recursion on public.users
-- This script drops ALL existing policies on public.users and recreates them safely.

-- 1. Drop ALL policies on public.users to clear any recursive subqueries
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- 2. Re-create helper functions as SECURITY DEFINER (Bypass RLS)
-- These functions MUST exist and be SECURITY DEFINER to avoid recursion when used in policies.

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  RETURN v_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role = 'Admin'
  );
END;
$$;

-- 3. Create Safe Policies

-- Policy A: Users can view their own profile
-- Simple, direct check. No subqueries.
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth_id = auth.uid());

-- Policy B: Users can view other users in the same tenant
-- Uses SECURITY DEFINER function to avoid recursion.
CREATE POLICY "Users can view tenant members"
ON public.users
FOR SELECT
USING (tenant_id = public.get_my_tenant_id());

-- Policy C: Admins can view all users
-- Uses SECURITY DEFINER function to avoid recursion.
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (public.is_admin());

-- Policy D: Update own profile
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth_id = auth.uid());

-- 4. Ensure Index exists
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
