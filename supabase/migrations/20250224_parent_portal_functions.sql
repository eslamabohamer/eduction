-- Secure Function for Parent Login
-- This allows parents to "log in" using codes without needing an Auth User account
CREATE OR REPLACE FUNCTION public.parent_login(
    p_student_code text,
    p_parent_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with higher privileges to bypass RLS for the login check
SET search_path = public
AS $$
DECLARE
    v_student_profile record;
    v_user_data record;
BEGIN
    -- Find student profile matching both codes
    SELECT * INTO v_student_profile
    FROM public.student_profiles
    WHERE student_code = p_student_code 
    AND parent_access_code = p_parent_code;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Get the associated user name
    SELECT name INTO v_user_data
    FROM public.users
    WHERE id = v_student_profile.user_id;

    -- Return combined data safely
    RETURN json_build_object(
        'id', v_student_profile.id,
        'user_id', v_student_profile.user_id,
        'student_code', v_student_profile.student_code,
        'grade', v_student_profile.grade,
        'level', v_student_profile.level,
        'user', json_build_object(
            'name', v_user_data.name
        )
    );
END;
$$;

-- Secure Function for Parent Dashboard Stats
-- Fetches stats only if the parent code is provided for verification
CREATE OR REPLACE FUNCTION public.get_parent_dashboard_stats(
    p_student_id uuid,
    p_parent_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_valid boolean;
    v_exam_stats json;
    v_homework_stats json;
    v_attendance_count integer;
BEGIN
    -- 1. Verify the parent has the right code for this student
    SELECT EXISTS (
        SELECT 1 FROM public.student_profiles
        WHERE id = p_student_id AND parent_access_code = p_parent_code
    ) INTO v_valid;

    IF NOT v_valid THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;

    -- 2. Fetch Exam Stats
    SELECT json_agg(t) INTO v_exam_stats
    FROM (
        SELECT 
            es.score,
            json_build_object('title', e.title, 'total_marks', e.total_marks) as exam
        FROM public.exam_submissions es
        JOIN public.exams e ON es.exam_id = e.id
        WHERE es.student_id = p_student_id
        ORDER BY es.submitted_at DESC
        LIMIT 5
    ) t;

    -- 3. Fetch Homework Stats
    SELECT json_agg(t) INTO v_homework_stats
    FROM (
        SELECT 
            hs.grade,
            json_build_object('title', h.title) as homework
        FROM public.homework_submissions hs
        JOIN public.homework h ON hs.homework_id = h.id
        WHERE hs.student_id = p_student_id
        ORDER BY hs.submitted_at DESC
        LIMIT 5
    ) t;

    -- 4. Fetch Attendance Count
    SELECT count(*) INTO v_attendance_count
    FROM public.live_session_attendance
    WHERE student_id = p_student_id;

    -- Return consolidated JSON
    RETURN json_build_object(
        'exams', COALESCE(v_exam_stats, '[]'::json),
        'homeworks', COALESCE(v_homework_stats, '[]'::json),
        'attendanceCount', v_attendance_count
    );
END;
$$;

-- Grant access to anonymous users (so the login page works before auth)
GRANT EXECUTE ON FUNCTION public.parent_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_dashboard_stats(uuid, text) TO anon, authenticated;

-- Fix Security Advisories (RLS on remaining tables)
ALTER TABLE IF EXISTS public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_session_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own video progress
DROP POLICY IF EXISTS "Users view own video progress" ON public.video_views;
CREATE POLICY "Users view own video progress" ON public.video_views
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM public.student_profiles WHERE id = student_id
    ));

-- Policy: Users can update their own video progress
DROP POLICY IF EXISTS "Users update own video progress" ON public.video_views;
CREATE POLICY "Users update own video progress" ON public.video_views
    FOR ALL USING (auth.uid() IN (
        SELECT user_id FROM public.student_profiles WHERE id = student_id
    ));
