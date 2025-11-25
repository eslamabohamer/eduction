/*
  # Advanced Payments Module
  
  ## New Tables
  1. fee_structures
     - Defines standard fees (e.g., Tuition, Bus) linked to Grade/Level
  
  ## Modified Tables
  1. financial_records
     - Add payment_method (cash, card, etc.)
     - Add invoice_number (unique)
     - Add fee_structure_id (FK)
     
  ## Functions
  1. get_financial_stats
     - Calculates total revenue, pending, etc.
*/

-- 1. Fee Structures Table
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
CREATE POLICY "Tenant isolation for fee_structures" ON public.fee_structures
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- 2. Update Financial Records
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'cheque', 'other')),
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS fee_structure_id UUID REFERENCES public.fee_structures(id);

-- Add unique constraint to invoice_number per tenant (optional, but good practice)
-- We use a partial index to allow nulls if not all records have invoices immediately
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_records_invoice_number 
ON public.financial_records(invoice_number, tenant_id) 
WHERE invoice_number IS NOT NULL;

-- 3. Financial Stats Function
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
