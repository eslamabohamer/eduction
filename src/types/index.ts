// src/types/index.ts
// تعريف الأنواع المشتركة
// Common type definitions for the application.

export type UserRole = 'Teacher' | 'Student' | 'Parent' | 'Supervisor' | 'Admin' | 'Secretary';

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  name: string;
  role: UserRole;
  tenant_id: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  type: 'individual' | 'center' | 'school';
  logo_url?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  student_code: string;
  grade: string;
  level: string;
  tenant_id: string;
  // Extended fields
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  address?: string;
  emergency_contact?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at: string;
}

export interface BehaviorNote {
  id: string;
  student_id: string;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  created_at: string;
  created_by: string;
}

export interface FinancialRecord {
  id: string;
  student_id: string;
  amount: number;
  type: 'payment' | 'fee' | 'discount';
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'overdue' | 'cancelled';
  payment_method?: 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'other';
  invoice_number?: string;
  fee_structure_id?: string;
}
