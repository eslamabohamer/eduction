-- COMPREHENSIVE FIX FOR STUDENT CREATION RPC
-- This script:
-- 1. Drops ALL existing versions of create_student_user_v2.
-- 2. Recreates it accepting ALL profile fields to ensure nothing is left NULL.
-- 3. Handles casting and defaults safely.

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

-- 3. Recreate Function (Comprehensive Version)
CREATE OR REPLACE FUNCTION public.create_student_user_v2(
    p_name text,
    p_username text,
    p_password text,
    p_grade text,
    p_level text,
    p_parent_access_code text DEFAULT NULL,
    p_dob text DEFAULT NULL, -- Accept TEXT for date
    p_phone text DEFAULT NULL,
    p_address text DEFAULT NULL,
    p_parent_name text DEFAULT NULL,
    p_parent_phone text DEFAULT NULL,
    p_parent_email text DEFAULT NULL,
    p_school_name text DEFAULT NULL,
    p_emergency_contact text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_teacher_id uuid;
    v_tenant_id text;
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
        v_dob_date := NULL;
    END;

    -- 2. Get current user (Teacher) ID
    v_teacher_id := auth.uid();
    
    -- 3. Get Tenant ID
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
        v_tenant_id::uuid, -- Cast to UUID (if column is text, it works; if uuid, it works)
        v_encrypted_pw,
        now()
    );

    -- 9. Insert into student_profiles with ALL fields
    INSERT INTO public.student_profiles (
        user_id,
        student_code,
        grade,
        level,
        parent_access_code,
        tenant_id,
        date_of_birth,
        phone,
        address,
        parent_name,
        parent_phone,
        parent_email,
        school_name,
        emergency_contact,
        notes
    ) VALUES (
        v_new_user_id,
        v_student_code,
        p_grade,
        p_level,
        v_parent_code,
        v_tenant_id::uuid,
        v_dob_date,
        p_phone,
        p_address,
        p_parent_name,
        p_parent_phone,
        p_parent_email,
        p_school_name,
        p_emergency_contact,
        p_notes
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
