/*
  # Final Security Polish & Trigger Sync

  ## Query Description:
  1. Ensures the 'users' table trigger exists to sync with auth.users automatically.
  2. Secures the new RPC functions (parent_login, etc.) by setting search_path to 'public'.
  3. Adds RLS to 'users' table if missing to ensure data privacy.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "Medium"
  - Requires-Backup: false
*/

-- 1. Ensure public.users table exists and has correct RLS
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'Student',
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Teachers can view all users (to see students)
DROP POLICY IF EXISTS "Teachers can view all users" ON public.users;
CREATE POLICY "Teachers can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Teacher'
    )
  );

-- 2. Ensure Trigger for User Sync exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, tenant_id)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'Student'),
    COALESCE(new.raw_user_meta_data->>'tenant_id', 'default')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create trigger to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Secure RPC Functions (Fix "Function Search Path Mutable" warnings)
ALTER FUNCTION public.create_student_record(text, text, text, text, text, date) SET search_path = public;
ALTER FUNCTION public.parent_login(text, text) SET search_path = public;
ALTER FUNCTION public.get_parent_dashboard_stats(uuid, text) SET search_path = public;
