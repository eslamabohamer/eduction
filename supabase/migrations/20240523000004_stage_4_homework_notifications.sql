/*
  # Stage 4: Homework, Notifications, and Calendar
  
  ## New Tables
  1. homework
     - Assignments created by teachers for classrooms
  2. homework_submissions
     - Student submissions for homework
  3. notifications
     - System notifications for users
     
  ## Security
  - RLS enabled on all tables
  - Policies for Tenant isolation
*/

-- 1. Homework Table
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Homework Submissions Table
CREATE TABLE IF NOT EXISTS public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id),
    content TEXT, -- Text answer or link
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id)
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'info', -- info, warning, success
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for Homework
CREATE POLICY "Users can view homework for their tenant" ON public.homework
    FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Teachers can manage homework" ON public.homework
    FOR ALL USING (
        tenant_id = get_my_tenant_id() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
    );

-- Policies for Submissions
CREATE POLICY "Users can view submissions for their tenant" ON public.homework_submissions
    FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Students can create submissions" ON public.homework_submissions
    FOR INSERT WITH CHECK (
        tenant_id = get_my_tenant_id() AND
        EXISTS (SELECT 1 FROM public.student_profiles WHERE id = student_id AND user_id = auth.uid())
    );

CREATE POLICY "Teachers can update submissions (grade)" ON public.homework_submissions
    FOR UPDATE USING (
        tenant_id = get_my_tenant_id() AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
    );

-- Policies for Notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications (mark read)" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Trigger to auto-create notification on new Homework
CREATE OR REPLACE FUNCTION notify_students_on_homework()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, body, link, tenant_id)
    SELECT 
        u.id,
        'واجب جديد: ' || NEW.title,
        'تم إضافة واجب جديد في فصلك الدراسي. الموعد النهائي: ' || NEW.due_date,
        '/homework',
        NEW.tenant_id
    FROM public.enrollments e
    JOIN public.student_profiles sp ON e.student_id = sp.id
    JOIN public.users u ON sp.user_id = u.id
    WHERE e.classroom_id = NEW.classroom_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_homework_created
    AFTER INSERT ON public.homework
    FOR EACH ROW
    EXECUTE FUNCTION notify_students_on_homework();
