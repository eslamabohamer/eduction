-- Create Admin Helper Function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
    AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Link to the teacher/school (tenant)
  plan_id UUID REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'open', 'void', 'uncollectible')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Admin (Global Access)
CREATE POLICY "Admins manage plans" ON plans USING (is_admin());
CREATE POLICY "Public view active plans" ON plans FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage subscriptions" ON subscriptions USING (is_admin());
CREATE POLICY "Tenants view own subscription" ON subscriptions FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Admins manage invoices" ON invoices USING (is_admin());
CREATE POLICY "Tenants view own invoices" ON invoices FOR SELECT USING (tenant_id = get_my_tenant_id());

-- Add "God Mode" policies for Admins on existing tables
-- This allows Admins to bypass tenant isolation
CREATE POLICY "Admins view all users" ON users FOR SELECT USING (is_admin());
CREATE POLICY "Admins manage all users" ON users FOR ALL USING (is_admin());

CREATE POLICY "Admins view all students" ON student_profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins view all classrooms" ON classrooms FOR SELECT USING (is_admin());

-- Insert Default Plans
INSERT INTO plans (name, price, interval, features) VALUES
('Basic Teacher', 29.99, 'month', '["Up to 50 students", "Basic Reporting", "Email Support"]'),
('Pro School', 99.99, 'month', '["Unlimited students", "Advanced Analytics", "Priority Support", "Custom Branding"]');
