-- Secure the critical helper function WITHOUT dropping it
-- This fixes the "Function Search Path Mutable" warning while preserving dependencies
ALTER FUNCTION public.get_my_tenant_id() SET search_path = 'public';

-- Fix the create_student_record function (Drop old version first)
DROP FUNCTION IF EXISTS public.create_student_record(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_student_record(
    p_name text,
    p_username text,
    p_grade text,
    p_level text,
    p_dob text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
    v_profile_id uuid;
    v_student_code text;
BEGIN
    -- Get tenant_id from the creator (Teacher/Secretary)
    v_tenant_id := get_my_tenant_id();
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User does not belong to a valid tenant';
    END IF;

    -- Generate a unique student code (Simple Random for demo)
    v_student_code := 'ST-' || floor(random() * 100000)::text;

    -- Create the user record (Mocking Auth - In real app, use supabase.auth.admin.createUser)
    -- Here we just insert into our public.users table which mirrors auth
    INSERT INTO public.users (name, username, role, tenant_id)
    VALUES (p_name, p_username, 'Student', v_tenant_id)
    RETURNING id INTO v_user_id;

    -- Create the student profile
    INSERT INTO public.student_profiles (
        user_id, 
        tenant_id, 
        student_code, 
        grade, 
        level,
        date_of_birth
    )
    VALUES (
        v_user_id,
        v_tenant_id,
        v_student_code,
        p_grade,
        p_level,
        CASE WHEN p_dob IS NOT NULL THEN p_dob::date ELSE NULL END
    )
    RETURNING id INTO v_profile_id;

    RETURN v_profile_id;
END;
$$;

-- Force Enable RLS on ALL tables (Fixes "RLS Disabled" Critical Errors)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation for Secretary (Drop if exists, then create)
-- This prevents "policy already exists" errors

DO $$ 
BEGIN
    -- Attendance Policy
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Secretary manage attendance') THEN
        DROP POLICY "Secretary manage attendance" ON public.attendance_records;
    END IF;
    CREATE POLICY "Secretary manage attendance" ON public.attendance_records
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.auth_id = auth.uid() 
                AND u.role = 'Secretary'
                AND u.tenant_id = attendance_records.tenant_id
            )
        );

    -- Finance Policy
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Secretary manage finances') THEN
        DROP POLICY "Secretary manage finances" ON public.financial_records;
    END IF;
    CREATE POLICY "Secretary manage finances" ON public.financial_records
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.auth_id = auth.uid() 
                AND u.role = 'Secretary'
                AND u.tenant_id = financial_records.tenant_id
            )
        );

    -- Behavior Policy
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Secretary manage behavior') THEN
        DROP POLICY "Secretary manage behavior" ON public.behavior_notes;
    END IF;
    CREATE POLICY "Secretary manage behavior" ON public.behavior_notes
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.auth_id = auth.uid() 
                AND u.role = 'Secretary'
                AND u.tenant_id = behavior_notes.tenant_id
            )
        );

END $$;
