    /*
    # Parent Portal Module Schema
    
    ## Query Description:
    This migration adds the necessary tables and columns for the Parent Portal.
    It links students to parents and sets up RLS policies for parent access.

    ## Metadata:
    - Schema-Category: "Feature"
    - Impact-Level: "Medium"
    - Requires-Backup: false
    - Reversible: true

    ## Structure Details:
    - `parent_profiles`: New table linked to `users`.
    - `student_profiles`: Added `parent_profile_id` FK.
    - RLS: Policies for parents to view their own profile and their children's data.
    */

    -- 1. Create Parent Profiles Table
    CREATE TABLE IF NOT EXISTS public.parent_profiles (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
        tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
        phone text,
        address text,
        created_at timestamptz DEFAULT now(),
        UNIQUE(tenant_id, user_id)
    );

    -- 2. Link Students to Parents
    ALTER TABLE public.student_profiles 
    ADD COLUMN IF NOT EXISTS parent_profile_id uuid REFERENCES public.parent_profiles(id);

    -- 3. Enable RLS
    ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

    -- 4. RLS Policies for Parent Profiles
    DROP POLICY IF EXISTS "Tenant isolation for parent_profiles" ON public.parent_profiles;
    CREATE POLICY "Tenant isolation for parent_profiles" ON public.parent_profiles
        FOR ALL USING (tenant_id = public.get_my_tenant_id());

    DROP POLICY IF EXISTS "Parents view own profile" ON public.parent_profiles;
    CREATE POLICY "Parents view own profile" ON public.parent_profiles
        FOR SELECT USING (user_id = auth.uid());

    -- 5. RLS Policies for Student Data Access by Parents

    -- Student Profiles: Parents can view their children
    DROP POLICY IF EXISTS "Parents view their children" ON public.student_profiles;
    CREATE POLICY "Parents view their children" ON public.student_profiles
        FOR SELECT USING (
            tenant_id = public.get_my_tenant_id() AND
            parent_profile_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid())
        );

    -- Attendance: Parents can view their children's attendance
    DROP POLICY IF EXISTS "Parents view children attendance" ON public.attendance_records;
    CREATE POLICY "Parents view children attendance" ON public.attendance_records
        FOR SELECT USING (
            tenant_id = public.get_my_tenant_id() AND
            student_id IN (
                SELECT id FROM public.student_profiles 
                WHERE parent_profile_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid())
            )
        );

    -- Behavior: Parents can view their children's behavior notes
    DROP POLICY IF EXISTS "Parents view children behavior" ON public.behavior_notes;
    CREATE POLICY "Parents view children behavior" ON public.behavior_notes
        FOR SELECT USING (
            tenant_id = public.get_my_tenant_id() AND
    -- Based on previous context, exam_submissions likely exists.

    DO $$
    BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exam_submissions') THEN
            DROP POLICY IF EXISTS "Parents view children exams" ON public.exam_submissions;
            EXECUTE 'CREATE POLICY "Parents view children exams" ON public.exam_submissions
                FOR SELECT USING (
                    student_id IN (
                        SELECT id FROM public.student_profiles 
                        WHERE parent_profile_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid())
                    )
                )';
        END IF;
    END
    $$;

    -- Homework: Parents can view their children's homework submissions
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'homework_submissions') THEN
            DROP POLICY IF EXISTS "Parents view children homework" ON public.homework_submissions;
            EXECUTE 'CREATE POLICY "Parents view children homework" ON public.homework_submissions
                FOR SELECT USING (
                    student_id IN (
                        SELECT id FROM public.student_profiles 
                        WHERE parent_profile_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid())
                    )
                )';
        END IF;
    END
    $$;
