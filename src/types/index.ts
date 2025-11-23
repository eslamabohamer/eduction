// src/types/index.ts
// تعريف الأنواع المشتركة
// Common type definitions for the application.

export type UserRole = 'Teacher' | 'Student' | 'Parent' | 'Supervisor' | 'Admin';

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
}
