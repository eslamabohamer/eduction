// src/services/parentService.ts
// خدمة إدارة أولياء الأمور
// Service for handling Parent Portal operations.

import { supabase } from '@/lib/supabase';
import { StudentWithUser } from './studentService';
import { FinancialRecord } from '@/types';

import { ServiceResponse } from '@/types/service';

const getCachedParentSession = (): (StudentWithUser & { parent_access_code?: string }) | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('parentSession');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const parentService = {
  async login(studentCode: string, parentCode: string): Promise<StudentWithUser & { parent_access_code: string }> {
    if (!studentCode || !parentCode) {
      throw new Error('كود الطالب وكود ولي الأمر مطلوبان');
    }

    const { data, error } = await supabase
      .from('student_profiles')
      .select(`
        *,
        user:users(*)
      `)
      .eq('student_code', studentCode)
      .eq('parent_access_code', parentCode)
      .single();

    if (error || !data) {
      console.error('Parent code login failed', error);
      throw new Error('بيانات الكود غير صحيحة. تأكد من كود الطالب وكود ولي الأمر');
    }

    return data as StudentWithUser & { parent_access_code: string };
  },
  /**
   * Get all children linked to the current parent
   * جلب جميع الأبناء المرتبطين بولي الأمر الحالي
   */
  async getMyChildren(): Promise<ServiceResponse<StudentWithUser[]>> {
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const cachedParent = getCachedParentSession();

      // Support code-only login when there is no Supabase auth session
      if (!user && cachedParent) {
        return { success: true, data: [cachedParent] };
      }

      if (!user) return { success: false, error: { message: 'Not authenticated' } };

      // 2. Get Parent Profile ID
      const { data: parentProfile } = await supabase
        .from('parent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!parentProfile) return { success: true, data: [] };

      // 3. Fetch Students linked to this parent
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          user:users(*)
        `)
        .eq('parent_profile_id', parentProfile.id);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as StudentWithUser[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Get aggregated stats for a child
   * جلب إحصائيات مجمعة للابن
   */
  async getChildStats(studentId: string): Promise<ServiceResponse<any>> {
    try {
      // Parallel fetch for performance
      const [attendance, finance, exams] = await Promise.all([
        supabase.from('attendance_records').select('status').eq('student_id', studentId),
        supabase.from('financial_records').select('amount, type').eq('student_id', studentId),
        supabase.from('exam_submissions').select('score').eq('student_id', studentId)
      ]);

      // Calculate Attendance
      const totalDays = attendance.data?.length || 0;
      const presentDays = attendance.data?.filter(r => r.status === 'present').length || 0;
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      // Calculate Finance
      const fees = finance.data?.filter(r => r.type === 'fee').reduce((a, b) => a + b.amount, 0) || 0;
      const payments = finance.data?.filter(r => r.type === 'payment').reduce((a, b) => a + b.amount, 0) || 0;
      const dueBalance = fees - payments;

      // Calculate Academics
      const examsCount = exams.data?.length || 0;
      // Simple average (assuming score is percentage or normalized, real app would need max marks)
      const avgScore = examsCount > 0
        ? Math.round(exams.data!.reduce((a, b) => a + b.score, 0) / examsCount)
        : 0;

      return {
        success: true,
        data: {
          attendanceRate,
          dueBalance,
          avgScore,
          examsCount
        }
      };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Get financial records for a specific child
   * جلب السجلات المالية لطالب محدد
   */
  async getChildFinancials(studentId: string): Promise<ServiceResponse<FinancialRecord[]>> {
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as FinancialRecord[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Get all financial records for all children
   * جلب جميع السجلات المالية لجميع الأبناء
   */
  async getAllFinancials(): Promise<ServiceResponse<FinancialRecord[]>> {
    try {
      const childrenRes = await this.getMyChildren();
      if (!childrenRes.success || !childrenRes.data) {
        return { success: false, error: childrenRes.error || { message: 'Failed to fetch children' } };
      }
      
      const children = childrenRes.data;
      const studentIds = children.map(c => c.id);

      if (studentIds.length === 0) return { success: true, data: [] };

      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          student:student_profiles(
            id,
            user:users(name)
          )
        `)
        .in('student_id', studentIds)
        .order('date', { ascending: false });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as any[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  }
};
