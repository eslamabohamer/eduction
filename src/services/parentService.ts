// src/services/parentService.ts
// خدمة إدارة أولياء الأمور
// Service for handling Parent Portal operations.

import { supabase } from '@/lib/supabase';
import { StudentWithUser } from './studentService';
import { FinancialRecord } from '@/types';

export const parentService = {
  /**
   * Get all children linked to the current parent
   * جلب جميع الأبناء المرتبطين بولي الأمر الحالي
   */
  async getMyChildren() {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 2. Get Parent Profile ID
    const { data: parentProfile } = await supabase
      .from('parent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!parentProfile) return [];

    // 3. Fetch Students linked to this parent
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`
        *,
        user:users(*)
      `)
      .eq('parent_profile_id', parentProfile.id);

    if (error) throw error;
    return data as StudentWithUser[];
  },

  /**
   * Get aggregated stats for a child
   * جلب إحصائيات مجمعة للابن
   */
  async getChildStats(studentId: string) {
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
      attendanceRate,
      dueBalance,
      avgScore,
      examsCount
    };
  },

  /**
   * Get financial records for a specific child
   * جلب السجلات المالية لطالب محدد
   */
  async getChildFinancials(studentId: string) {
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as FinancialRecord[];
  },

  /**
   * Get all financial records for all children
   * جلب جميع السجلات المالية لجميع الأبناء
   */
  async getAllFinancials() {
    const children = await this.getMyChildren();
    const studentIds = children.map(c => c.id);

    if (studentIds.length === 0) return [];

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

    if (error) throw error;
    return data;
  }
};
