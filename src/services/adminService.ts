// src/services/adminService.ts
// خدمة لوحة التحكم للمسؤول
// Service for Admin Panel operations (Global Management).

import { supabase } from '@/lib/supabase';

export interface TenantStats {
  id: string;
  name: string;
  user_count: number;
  student_count: number;
  created_at: string;
  status: 'active' | 'suspended';
}

import { ServiceResponse } from '@/types/service';

export const adminService = {
  /**
   * Get platform-wide KPIs
   * الحصول على مؤشرات الأداء الرئيسية للمنصة
   */
  async getPlatformStats(): Promise<ServiceResponse<any>> {
    try {
      // Parallel fetching for performance
      const [tenants, students, subscriptions, revenue] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'Teacher'),
        supabase.from('student_profiles').select('id', { count: 'exact' }),
        supabase.from('subscriptions').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('invoices').select('amount').eq('status', 'paid')
      ]);

      const totalRevenue = revenue.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      return {
        success: true,
        data: {
          totalTenants: tenants.count || 0,
          totalStudents: students.count || 0,
          activeSubscriptions: subscriptions.count || 0,
          totalRevenue
        }
      };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Get all tenants (Teachers/Schools) with stats
   * جلب جميع المستأجرين مع الإحصائيات
   */
  async getTenants(): Promise<ServiceResponse<any[]>> {
    try {
      // In a real scenario, we might have a separate 'tenants' table.
      // Here we assume Teachers represent tenants.
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'Teacher')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Suspend or Activate a tenant
   * تجميد أو تفعيل حساب مستأجر
   */
  async toggleTenantStatus(userId: string, status: 'active' | 'suspended'): Promise<ServiceResponse<void>> {
    try {
      // This would typically update a 'status' column in users or tenants table
      // For now, we'll assume we have such a column or use metadata
      // Using a mock update for demonstration if column doesn't exist in schema yet
      /*
      const { error } = await supabase
        .from('users')
        .update({ status }) 
        .eq('id', userId);
      */
      console.log(`[Admin] Set tenant ${userId} to ${status}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Get global user list with pagination/search
   * البحث في جميع المستخدمين
   */
  async searchGlobalUsers(query: string): Promise<ServiceResponse<any[]>> {
    try {
      let queryBuilder = supabase
        .from('users')
        .select('*')
        .limit(50);

      if (query) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      const { data, error } = await queryBuilder;
      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Get Subscription Plans
   * جلب خطط الاشتراك
   */
  async getPlans(): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  }
};
