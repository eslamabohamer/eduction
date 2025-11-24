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

export interface PlatformStats {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_revenue: number;
  active_tenants: number;
  monthly_growth: number;
}

export const adminService = {
  /**
   * Get platform-wide KPIs
   * الحصول على مؤشرات الأداء الرئيسية للمنصة
   */
  /**
   * Get Platform Statistics (KPIs)
   */
  async getPlatformStats(): Promise<ServiceResponse<PlatformStats>> {
    try {
      const { data, error } = await supabase.rpc('get_admin_kpis');
      if (error) return { success: false, error: { message: error.message, code: error.code } };

      // Map RPC result to PlatformStats interface
      // Note: RPC returns snake_case, interface might need adjustment or mapping
      return {
        success: true,
        data: {
          total_users: data.total_users,
          total_students: data.total_students,
          total_teachers: data.total_teachers,
          total_revenue: data.total_revenue,
          active_tenants: data.active_tenants,
          monthly_growth: 0 // Placeholder or calculated from getGrowthStats if needed here
        }
      };
    } catch (err: any) {
      return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
    }
  },

  /**
   * Get Monthly Growth Stats
   */
  async getGrowthStats(): Promise<ServiceResponse<{ revenue_growth: any[], user_growth: any[] }>> {
    try {
      const { data, error } = await supabase.rpc('get_monthly_growth');
      if (error) return { success: false, error: { message: error.message, code: error.code } };
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
    }
  },

  /**
   * Get User Distribution
   */
  async getUserDistribution(): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase.rpc('get_user_distribution');
      if (error) return { success: false, error: { message: error.message, code: error.code } };
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: { message: err.message, code: 'UNKNOWN_ERROR' } };
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
      const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

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
