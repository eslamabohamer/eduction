-- Fix 500 error in AuthContext by ensuring efficient and non-recursive access to user profile

-- 1. Ensure index on auth_id for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

-- 2. Drop potentially problematic policies (cleanup)
-- We drop common names to ensure we don't have duplicates or conflicting policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "View own profile" ON public.users;

-- 3. Create a simple, non-recursive policy for users to view their own profile
-- This is critical for AuthContext to load the initial user profile without hitting complex tenant logic
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth_id = auth.uid());

-- 4. Ensure get_my_tenant_id is SECURITY DEFINER to avoid recursion in other policies
-- This function is often used in other RLS policies, so it must be performant and safe
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO service_role;
