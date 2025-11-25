-- Fix for "column tenant_id is of type uuid but expression is of type text" error

-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Redefine the core function with strict UUID handling
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
SET search_path TO 'public'
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
    
    -- 2. Get Tenant ID and ensure it is treated as UUID
    SELECT tenant_id INTO v_tenant_id
    FROM public.users
    WHERE id = v_teacher_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Teacher does not belong to a valid tenant';
    END IF;

    -- 3. Check if username exists
    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RAISE EXCEPTION 'اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر';
    END IF;

    -- 4. Generate codes
    v_student_code := upper(substring(md5(random()::text) from 1 for 8));
    -- Use provided parent code or generate new one
    IF p_parent_access_code IS NOT NULL THEN
        v_parent_code := p_parent_access_code;
    ELSE
        v_parent_code := upper(substring(md5(random()::text) from 1 for 6));
    END IF;
    
    -- 5. Generate new User ID
    v_new_user_id := gen_random_uuid();
    
    -- 6. Encrypt password
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 7. Insert into public.users with explicit UUID casting for tenant_id
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
        v_tenant_id::uuid, -- EXPLICIT CAST TO FIX THE ERROR
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
        v_tenant_id::uuid, -- EXPLICIT CAST TO FIX THE ERROR
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

-- Update the wrapper function to support the new fields and date handling
CREATE OR REPLACE FUNCTION public.create_student_record(
    p_name text,
    p_username text,
    p_password text,
    p_grade text,
    p_level text,
    p_dob text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dob date;
BEGIN
    -- Handle Date Parsing safely
    IF p_dob IS NOT NULL AND p_dob != '' THEN
        BEGIN
            v_dob := p_dob::date;
        EXCEPTION WHEN OTHERS THEN
            v_dob := NULL;
        END;
    ELSE
        v_dob := NULL;
    END IF;

    RETURN public.create_student_user_v2(
        p_name,
        p_username,
        p_password,
        p_grade,
        p_level,
        NULL,
        v_dob,
        p_phone,
        p_address
    );
END;
$$;
