/* Add classroom_id to fee_structures */
ALTER TABLE public.fee_structures 
ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE;

/* Function to bulk assign fees to students in a classroom or grade */
CREATE OR REPLACE FUNCTION public.assign_fee_to_students(
    p_fee_structure_id UUID,
    p_classroom_id UUID DEFAULT NULL,
    p_grade TEXT DEFAULT NULL,
    p_level TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_fee_amount NUMERIC;
    v_fee_name TEXT;
    v_tenant_id UUID;
    v_student RECORD;
BEGIN
    -- Get fee details
    SELECT amount, name, tenant_id INTO v_fee_amount, v_fee_name, v_tenant_id
    FROM public.fee_structures
    WHERE id = p_fee_structure_id;

    IF v_fee_amount IS NULL THEN
        RAISE EXCEPTION 'Fee structure not found';
    END IF;

    -- Loop through eligible students
    FOR v_student IN 
        SELECT sp.id, sp.user_id 
        FROM public.student_profiles sp
        LEFT JOIN public.enrollments e ON sp.id = e.student_id
        WHERE sp.tenant_id = v_tenant_id
        AND (
            (p_classroom_id IS NOT NULL AND e.classroom_id = p_classroom_id)
            OR
            (p_classroom_id IS NULL AND sp.grade = p_grade AND sp.level = p_level)
        )
    LOOP
        -- Insert Financial Record (if not exists for this fee structure)
        INSERT INTO public.financial_records (
            student_id, 
            amount, 
            type, 
            status, 
            description, 
            date, 
            tenant_id,
            fee_structure_id
        )
        VALUES (
            v_student.id,
            v_fee_amount,
            'fee',
            'pending',
            v_fee_name,
            NOW(),
            v_tenant_id,
            p_fee_structure_id
        )
        ON CONFLICT DO NOTHING; -- Avoid duplicates if unique constraint exists (or just insert)
        
        -- Send Notification
        INSERT INTO public.notifications (
            user_id, 
            title, 
            body, 
            type, 
            tenant_id
        )
        VALUES (
            v_student.user_id,
            'رسوم دراسية جديدة',
            'تم إضافة رسوم جديدة: ' || v_fee_name || ' بقيمة ' || v_fee_amount || ' ج.م',
            'info',
            v_tenant_id
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;
