/*
  # Student Management Module Schema
  
  ## Query Description:
  This migration adds the necessary tables and columns for the comprehensive student management system.
  It includes attendance tracking, behavior notes, financial records, and extended profile details.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - `student_profiles`: Added parent info, address, contacts.
  - `attendance_records`: New table for tracking daily attendance.
  - `behavior_notes`: New table for teacher notes on student behavior.
  - `financial_records`: New table for tracking fees and payments.
*/

-- Add extended fields to student_profiles
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS parent_name text,
ADD COLUMN IF NOT EXISTS parent_phone text,
ADD COLUMN IF NOT EXISTS parent_email text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS emergency_contact text,
ADD COLUMN IF NOT EXISTS notes text;

-- Create Attendance Records Table (if not exists from init_schema)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes text,
    tenant_id uuid REFERENCES public.tenants(id),
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Create Behavior Notes Table
CREATE TABLE IF NOT EXISTS public.behavior_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL CHECK (type IN ('positive', 'negative', 'neutral')),
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    tenant_id uuid REFERENCES public.tenants(id)
);

-- Create Financial Records Table
CREATE TABLE IF NOT EXISTS public.financial_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric(10, 2) NOT NULL,
    type text NOT NULL CHECK (type IN ('payment', 'fee', 'discount')),
    description text,
    date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'overdue', 'cancelled')),
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    tenant_id uuid REFERENCES public.tenants(id)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/insecurity
DROP POLICY IF EXISTS "Teachers can view attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can insert attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can delete attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Tenant isolation for attendance" ON public.attendance_records;

DROP POLICY IF EXISTS "Teachers can view behavior" ON public.behavior_notes;
DROP POLICY IF EXISTS "Teachers can insert behavior" ON public.behavior_notes;

DROP POLICY IF EXISTS "Teachers can view finances" ON public.financial_records;
DROP POLICY IF EXISTS "Teachers can insert finances" ON public.financial_records;
DROP POLICY IF EXISTS "Teachers can update finances" ON public.financial_records;

-- RLS Policies for Attendance
CREATE POLICY "Tenant isolation for attendance" ON public.attendance_records
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Students view own attendance" ON public.attendance_records
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id() AND
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- RLS Policies for Behavior Notes
CREATE POLICY "Tenant isolation for behavior" ON public.behavior_notes
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Students view own behavior" ON public.behavior_notes
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id() AND
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- RLS Policies for Financial Records
CREATE POLICY "Tenant isolation for finances" ON public.financial_records
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Students view own finances" ON public.financial_records
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id() AND
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
