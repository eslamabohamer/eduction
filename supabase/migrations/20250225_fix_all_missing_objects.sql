/*
  # FIX ALL MISSING OBJECTS
  This migration combines missing parts from previous steps.
  Run this in Supabase SQL Editor to fix 404 errors.
*/

-- ==========================================
-- 1. Advanced Payments (Fee Structures & Stats)
-- ==========================================

-- Fee Structures Table
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    grade TEXT NOT NULL,
    level TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tuition', 'bus', 'books', 'uniform', 'activity', 'other')),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fee_structures' AND policyname = 'Tenant isolation for fee_structures'
    ) THEN
        CREATE POLICY "Tenant isolation for fee_structures" ON public.fee_structures
            FOR ALL USING (tenant_id = public.get_my_tenant_id());
    END IF;
END $$;

-- Update Financial Records
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'cheque', 'other')),
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS fee_structure_id UUID REFERENCES public.fee_structures(id);

-- Add unique constraint to invoice_number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_records_invoice_number 
ON public.financial_records(invoice_number, tenant_id) 
WHERE invoice_number IS NOT NULL;

-- Financial Stats Function
CREATE OR REPLACE FUNCTION public.get_financial_stats()
RETURNS TABLE (
    total_revenue NUMERIC,
    total_pending NUMERIC,
    total_overdue NUMERIC,
    monthly_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'payment' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' AND type = 'fee' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'overdue' AND type = 'fee' THEN amount ELSE 0 END), 0) as total_overdue,
        COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'payment' AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as monthly_revenue
    FROM public.financial_records
    WHERE tenant_id = public.get_my_tenant_id();
END;
$$;

-- ==========================================
-- 2. Classroom Fees (Modifications)
-- ==========================================

-- Add classroom_id to fee_structures
ALTER TABLE public.fee_structures 
ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE;

-- Function to bulk assign fees
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
        -- Insert Financial Record
        INSERT INTO public.financial_records (
            student_id, amount, type, status, description, date, tenant_id, fee_structure_id
        )
        VALUES (
            v_student.id, v_fee_amount, 'fee', 'pending', v_fee_name, NOW(), v_tenant_id, p_fee_structure_id
        )
        ON CONFLICT DO NOTHING;
        
        -- Send Notification
        INSERT INTO public.notifications (
            user_id, title, body, type, tenant_id
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

-- ==========================================
-- 3. Activity Logs
-- ==========================================

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Teachers and Admins can view all logs'
    ) THEN
        CREATE POLICY "Teachers and Admins can view all logs" ON public.activity_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE users.id = auth.uid()
                    AND (users.role = 'Teacher' OR users.role = 'Admin')
                    AND users.tenant_id = activity_logs.tenant_id
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Users can insert their own logs'
    ) THEN
        CREATE POLICY "Users can insert their own logs" ON public.activity_logs
            FOR INSERT
            WITH CHECK (
                auth.uid() = user_id
            );
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON public.activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
