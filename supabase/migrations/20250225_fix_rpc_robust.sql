-- ROBUST FIX FOR RPC FUNCTION
-- This script:
-- 1. Drops ALL existing versions of create_student_user_v2.
-- 2. Recreates it accepting TEXT for everything (dates, ids) to be safe.
-- 3. Handles casting internally.

-- 1. Drop ALL existing versions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT oid::regprocedure AS func_signature
             FROM pg_proc
             WHERE proname = 'create_student_user_v2'
             AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature;
    END LOOP;
END $$;

-- 2. Enable pgcrypto
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 3. Recreate Function (Robust Version)
CREATE OR REPLACE FUNCTION public.create_student_user_v2(
    p_name text,
    p_username text,
    p_password text,
    p_grade text,
    p_level text,
    p_parent_access_code text DEFAULT NULL,
    p_dob text DEFAULT NULL, -- Accept TEXT for date to avoid RPC issues
    p_phone text DEFAULT NULL,
    p_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_teacher_id uuid;
    v_tenant_id text; -- Use TEXT to be safe (works for both UUID and TEXT columns)
    v_new_user_id uuid;
    v_student_code text;
    v_parent_code text;
    v_encrypted_pw text;
    v_dob_date date;
BEGIN
    -- 1. Parse Date
    BEGIN
        IF p_dob IS NOT NULL AND p_dob != '' THEN
            v_dob_date := p_dob::date;
        ELSE
            v_dob_date := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_dob_date := NULL; -- Fallback if invalid format
    END;

    -- 2. Get current user (Teacher) ID
    v_teacher_id := auth.uid();
    
    -- 3. Get Tenant ID (Cast to text to be safe)
    SELECT tenant_id::text INTO v_tenant_id
    FROM public.users
    WHERE id = v_teacher_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Teacher does not belong to a valid tenant';
    END IF;

    -- 4. Check if username exists
    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RAISE EXCEPTION 'Username already exists';
    END IF;

    -- 5. Generate codes
    v_student_code := upper(substring(md5(random()::text) from 1 for 8));
    
    IF p_parent_access_code IS NOT NULL AND p_parent_access_code != '' THEN
        v_parent_code := p_parent_access_code;
    ELSE
        v_parent_code := upper(substring(md5(random()::text) from 1 for 6));
    END IF;
    
    -- 6. Generate new User ID
    v_new_user_id := gen_random_uuid();
    
    -- 7. Encrypt password
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 8. Insert into public.users
    -- We insert v_tenant_id (text). 
    -- If column is UUID, Postgres casts text->uuid.
    -- If column is TEXT, Postgres inserts text.
    INSERT INTO public.users (
        id,
        name,
        username,
        role,
        tenant_id,
        password_hash,
        created_at
    ) VALUES (
        v_new_user_id,
        p_name,
        p_username,
        'Student',
        v_tenant_id::uuid, -- Try explicit cast to UUID. If column is TEXT, UUID->TEXT works.
        v_encrypted_pw,
        now()
    );

    -- 9. Insert into student_profiles
    INSERT INTO public.student_profiles (
        user_id,
        student_code,
        grade,
        level,
        parent_access_code,
        tenant_id,
        date_of_birth,
        phone,
        address
    ) VALUES (
        v_new_user_id,
        v_student_code,
        p_grade,
        p_level,
        v_parent_code,
        v_tenant_id::uuid, -- Same here
        v_dob_date,
        p_phone,
        p_address
    );

    RETURN json_build_object(
        'id', v_new_user_id,
        'student_code', v_student_code,
        'parent_code', v_parent_code
    );
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO service_role;
GRANT EXECUTE ON FUNCTION public.create_student_user_v2 TO anon;

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload config';
