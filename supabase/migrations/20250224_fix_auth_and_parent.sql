-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add parent_access_code to student_profiles if not exists
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS parent_access_code text;

-- Drop old function to avoid conflicts
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, date);
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, text, date);

-- Create robust function to create student auth and profile
CREATE OR REPLACE FUNCTION public.create_student_record(
    p_name text,
    p_username text,
    p_password text,
    p_grade text,
    p_level text,
    p_dob date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_parent_code text;
    v_email text;
    v_student_code text;
BEGIN
    -- Get tenant_id from current user (teacher)
    SELECT tenant_id INTO v_tenant_id FROM users WHERE id = auth.uid();
    
    -- Generate email (username@student.local)
    v_email := lower(p_username) || '@student.local';
    
    -- Generate random parent code (6 chars)
    v_parent_code := upper(substring(md5(random()::text), 1, 6));
    
    -- Generate student code
    v_student_code := upper(substring(md5(random()::text), 1, 8));

    -- Check if username already exists (by checking email)
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RAISE EXCEPTION 'اسم المستخدم هذا مستخدم بالفعل';
    END IF;

    -- Insert into auth.users directly (simulating signUp)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        v_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        jsonb_build_object('name', p_name, 'role', 'Student', 'tenant_id', v_tenant_id, 'username', p_username),
        now(),
        now(),
        '',
        ''
    ) RETURNING id INTO v_user_id;

    -- Insert into public.users
    INSERT INTO public.users (id, email, username, name, role, tenant_id)
    VALUES (v_user_id, v_email, p_username, p_name, 'Student', v_tenant_id);

    -- Insert into student_profiles
    INSERT INTO public.student_profiles (
        user_id, 
        student_code, 
        grade, 
        level, 
        tenant_id, 
        date_of_birth,
        parent_access_code
    )
    VALUES (
        v_user_id, 
        v_student_code,
        p_grade, 
        p_level, 
        v_tenant_id, 
        p_dob,
        v_parent_code
    );

    RETURN json_build_object(
        'user_id', v_user_id,
        'email', v_email,
        'student_code', v_student_code,
        'parent_code', v_parent_code
    );
END;
$$;
