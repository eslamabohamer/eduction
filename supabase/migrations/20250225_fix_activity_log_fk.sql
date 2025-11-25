/*
  # FIX ACTIVITY LOGS RELATIONSHIP
  This migration updates the foreign key on activity_logs to reference public.users instead of auth.users.
  This allows the API to fetch user details (name, role) when querying logs.
*/

-- 1. Drop the existing foreign key constraint (if it exists)
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- 2. Add the new foreign key constraint referencing public.users
-- We use ON DELETE SET NULL to keep logs even if the user is deleted
ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- 3. Refresh the schema cache (by notifying PostgREST)
NOTIFY pgrst, 'reload config';
