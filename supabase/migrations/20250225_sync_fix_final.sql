/*
  # FINAL SYNCHRONIZATION FIX
  This migration fixes the disconnect between the website and the database.
  It ensures all users are correctly linked to their tenants and auth accounts.
*/

-- 1. Ensure auth_id exists in public.users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auth_id') THEN
        ALTER TABLE public.users ADD COLUMN auth_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Sync auth_id with id for legacy users (if auth_id is NULL)
-- We assume for legacy users, id WAS the auth_id
UPDATE public.users 
SET auth_id = id 
WHERE auth_id IS NULL;

-- 3. Fix get_my_tenant_id to use auth_id
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
  WHERE auth_id = auth.uid(); -- Changed from id to auth_id
  
  RETURN v_tenant_id;
END;
$$;

-- 4. Ensure all users have a tenant_id
-- If a user has no tenant, create a default one for them
DO $$
DECLARE
    r RECORD;
    v_new_tenant_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.users WHERE tenant_id IS NULL LOOP
        -- Create a personal tenant for this user
        INSERT INTO public.tenants (name, type)
        VALUES (COALESCE(r.name, 'My School') || ' Tenant', 'individual')
        RETURNING id INTO v_new_tenant_id;

        -- Assign user to this tenant
        UPDATE public.users 
        SET tenant_id = v_new_tenant_id 
        WHERE id = r.id;
    END LOOP;
END $$;

-- 5. Sync Student Profiles with User Tenant
-- Ensure students belong to the same tenant as their user record
UPDATE public.student_profiles sp
SET tenant_id = u.tenant_id
FROM public.users u
WHERE sp.user_id = u.auth_id -- Link via auth_id
AND sp.tenant_id IS NULL;

-- 6. Re-apply Activity Logs Table (Just in case)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Enable RLS for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Teachers and Admins can view all logs'
    ) THEN
        CREATE POLICY "Teachers and Admins can view all logs" ON public.activity_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE users.auth_id = auth.uid() -- Use auth_id here too
                    AND (users.role = 'Teacher' OR users.role = 'Admin' OR users.role = 'Secretary')
                    AND users.tenant_id = activity_logs.tenant_id
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Users can insert their own logs'
    ) THEN
        CREATE POLICY "Users can insert their own logs" ON public.activity_logs
            FOR INSERT
            WITH CHECK (
                auth.uid() = user_id
            );
    END IF;
END $$;

-- 7. Fix is_admin function to use auth_id
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
