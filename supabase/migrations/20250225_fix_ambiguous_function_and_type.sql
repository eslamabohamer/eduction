-- FIX AMBIGUOUS FUNCTION ERROR
-- This script:
-- 1. Drops ALL existing versions of create_student_user_v2 (to fix the ambiguity).
-- 2. Recreates the function with the user's desired signature (including phone/address).
-- 3. Includes the explicit UUID casting the user added.

-- 1. Drop ALL existing versions of create_student_user_v2
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
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Recreate the function with the CORRECT signature and logic
CREATE OR REPLACE FUNCTION public.create_student_user_v2(
    p_name text,
    p_username text,
    p_password text,
    p_grade text,
    p_level text,
    p_parent_access_code text DEFAULT NULL,
    p_dob date DEFAULT NULL,
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
    v_tenant_id uuid;
    v_new_user_id uuid;
    v_student_code text;
    v_parent_code text;
    v_encrypted_pw text;
BEGIN
    -- 1. Get current user (Teacher) ID
    v_teacher_id := auth.uid();
    
    -- 2. Get Tenant ID
    SELECT tenant_id INTO v_tenant_id
    FROM public.users
    WHERE id = v_teacher_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Teacher does not belong to a valid tenant';
    END IF;

    -- 3. Check if username exists
    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RAISE EXCEPTION 'Username already exists';
    END IF;

    -- 4. Generate codes
    v_student_code := upper(substring(md5(random()::text) from 1 for 8));
    
    IF p_parent_access_code IS NOT NULL THEN
        v_parent_code := p_parent_access_code;
    ELSE
        v_parent_code := upper(substring(md5(random()::text) from 1 for 6));
    END IF;
    
    -- 5. Generate new User ID
    v_new_user_id := gen_random_uuid();
    
    -- 6. Encrypt password
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 7. Insert into public.users
    -- Note: We cast v_tenant_id to uuid to ensure type compatibility if the column is uuid
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
        v_tenant_id, -- Postgres should handle the type if it matches, or we can cast if needed. 
                     -- If the column is TEXT, this UUID variable will cast to text. 
                     -- If the column is UUID, it stays UUID.
        v_encrypted_pw,
        now()
    );

    -- 8. Insert into student_profiles
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
        v_tenant_id,
        p_dob,
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
