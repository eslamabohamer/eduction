// src/services/studentService.ts
// خدمة إدارة الطلاب
// Handles student fetching, creation, and extended management operations.

import { supabase } from '@/lib/supabase';
import { StudentProfile, User, AttendanceRecord, BehaviorNote, FinancialRecord } from '@/types';
import { ServiceResponse } from '@/types/service';
import { activityLogService } from './activityLogService';

export interface StudentWithUser extends StudentProfile {
  user: User;
}

export const studentService = {
  /**
   * Fetch all students for the current tenant
   * جلب جميع الطلاب للمستأجر الحالي
   */
  async getStudents(): Promise<ServiceResponse<StudentWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          user:users(*)
        `);

      if (error) {
        return {
          success: false,
          error: { message: error.message, code: error.code }
        };
      }
      return { success: true, data: data as StudentWithUser[] };
    } catch (err: any) {
      return {
        success: false,
        error: { message: err.message || 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }
      };
    }
  },

  /**
   * Get single student details
   * جلب تفاصيل طالب واحد
   */
  async getStudentById(id: string): Promise<ServiceResponse<StudentWithUser>> {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          user:users(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as StudentWithUser };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Create a new student record
   * إنشاء سجل طالب جديد
   */
  /**
   * Create a new student record
   * إنشاء سجل طالب جديد
   */
  async createStudent(data: {
    name: string;
    username: string;
    grade: string;
    level: string;
    dateOfBirth?: Date;
    // Extended fields
    parent_name?: string;
    parent_phone?: string;
    address?: string;
  }): Promise<ServiceResponse<{ id: string; password: string; parentCode: string }>> {
    try {
      // Validation
      if (!data.name || !data.username || !data.grade || !data.level) {
        return {
          success: false,
          error: { message: 'Missing required fields', code: 'VALIDATION_ERROR' }
        };
      }

      // Generate Temporary Password and Parent Code
      const password = Math.random().toString(36).slice(-8) + 'A1!'; // Simple random password
      const parentCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

      // 1. Call RPC to create user and basic profile
      const { data: result, error } = await supabase.rpc('create_student_user', {
        p_name: data.name,
        p_username: data.username,
        p_password: password,
        p_grade: data.grade,
        p_level: data.level,
        p_parent_access_code: parentCode,
        p_dob: data.dateOfBirth ? data.dateOfBirth.toISOString().split('T')[0] : null
      });

      if (error) {
        return {
          success: false,
          error: { message: error.message, code: error.code, details: error.details }
        };
      }

      // 2. Update extended profile fields
      const updates: any = {};
      if (data.parent_name) updates.parent_name = data.parent_name;
      if (data.parent_phone) updates.parent_phone = data.parent_phone;
      if (data.address) updates.address = data.address;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('student_profiles')
          .update(updates)
          .eq('id', result);

        if (updateError) {
          console.error('Failed to update extended profile info', updateError);
        }
      }

      // Log Activity
      await activityLogService.logAction('create_student', 'student', result, {
        name: data.name,
        grade: data.grade,
        level: data.level
      });

      return { success: true, data: { id: result, password, parentCode } };

    } catch (err: any) {
      return {
        success: false,
        error: { message: err.message || 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }
      };
    }
  },

  /**
   * Update student profile
   * تحديث بيانات الطالب
   */
  async updateStudent(id: string, data: Partial<StudentProfile> & { name?: string }): Promise<ServiceResponse<void>> {
    try {
      // Update profile fields
      const profileUpdates: any = {};
      if (data.grade) profileUpdates.grade = data.grade;
      if (data.level) profileUpdates.level = data.level;
      if (data.parent_name) profileUpdates.parent_name = data.parent_name;
      if (data.parent_phone) profileUpdates.parent_phone = data.parent_phone;
      if (data.address) profileUpdates.address = data.address;
      if (data.emergency_contact) profileUpdates.emergency_contact = data.emergency_contact;

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('student_profiles')
          .update(profileUpdates)
          .eq('id', id);

        if (error) {
          return {
            success: false,
            error: { message: error.message, code: error.code }
          };
        }
      }

      // Update user name if provided
      if (data.name) {
        // We need the user_id first
        const { data: profile, error: fetchError } = await supabase
          .from('student_profiles')
          .select('user_id')
          .eq('id', id)
          .single();

        if (fetchError) {
          return { success: false, error: { message: fetchError.message, code: fetchError.code } };
        }

        if (profile) {
          const { error: userError } = await supabase
            .from('users')
            .update({ name: data.name })
            .eq('auth_id', profile.user_id);

          if (userError) {
            return { success: false, error: { message: userError.message, code: userError.code } };
          }
        }
      }

      // Log Activity
      await activityLogService.logAction('update_student', 'student', id, {
        updates: data
      });

      return { success: true };

    } catch (err: any) {
      return {
        success: false,
        error: { message: err.message || 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }
      };
    }
  },

  /**
   * Delete a student
   * حذف طالب
   */
  async deleteStudent(id: string): Promise<ServiceResponse<void>> {
    try {
      // 1. Get user_id before deleting profile (to delete auth user if possible/needed)
      // Note: Deleting profile will cascade delete related data, but NOT the public.users or auth.users record usually
      // unless set up with triggers.
      // For now, we just delete the profile.

      const { error } = await supabase
        .from('student_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: { message: error.message, code: error.code }
        };
      }

      // Log Activity
      await activityLogService.logAction('delete_student', 'student', id, {});

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: { message: err.message || 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }
      };
    }
  },

  /**
   * Find student by code (for barcode scanner)
   * البحث عن طالب بالكود
   */
  async getStudentByCode(code: string): Promise<ServiceResponse<StudentWithUser>> {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          user:users(*)
        `)
        .eq('student_code', code)
        .single();

      if (error) {
        return {
          success: false,
          error: { message: error.message, code: error.code }
        };
      }
      return { success: true, data: data as StudentWithUser };
    } catch (err: any) {
      return {
        success: false,
        error: { message: err.message || 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }
      };
    }
  },

  // --- Attendance Operations (عمليات الحضور) ---

  async getAttendance(studentId: string): Promise<ServiceResponse<AttendanceRecord[]>> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as AttendanceRecord[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async addAttendance(record: Omit<AttendanceRecord, 'id' | 'created_at'>): Promise<ServiceResponse<void>> {
    try {
      // Fetch student's tenant_id
      const { data: student } = await supabase
        .from('student_profiles')
        .select('tenant_id')
        .eq('id', record.student_id)
        .single();

      if (!student) return { success: false, error: { message: 'Student not found' } };

      const { error } = await supabase
        .from('attendance_records')
        .insert({
          ...record,
          tenant_id: student.tenant_id
        });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  // --- Behavior Operations (عمليات السلوك) ---

  async getBehaviorNotes(studentId: string): Promise<ServiceResponse<BehaviorNote[]>> {
    try {
      const { data, error } = await supabase
        .from('behavior_notes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as BehaviorNote[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async addBehaviorNote(note: Omit<BehaviorNote, 'id' | 'created_at' | 'created_by'>): Promise<ServiceResponse<void>> {
    try {
      // Fetch student's tenant_id
      const { data: student } = await supabase
        .from('student_profiles')
        .select('tenant_id')
        .eq('id', note.student_id)
        .single();

      if (!student) return { success: false, error: { message: 'Student not found' } };

      const { error } = await supabase
        .from('behavior_notes')
        .insert({
          ...note,
          tenant_id: student.tenant_id
        });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  // --- Financial Operations (العمليات المالية) ---

  async getFinancialRecords(studentId: string): Promise<ServiceResponse<FinancialRecord[]>> {
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

  async addFinancialRecord(record: Omit<FinancialRecord, 'id' | 'created_at'>): Promise<ServiceResponse<void>> {
    try {
      // Fetch student's tenant_id
      const { data: student } = await supabase
        .from('student_profiles')
        .select('tenant_id')
        .eq('id', record.student_id)
        .single();

      if (!student) return { success: false, error: { message: 'Student not found' } };

      const { error } = await supabase
        .from('financial_records')
        .insert({
          ...record,
          tenant_id: student.tenant_id
        });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  // --- Academic Stats (الإحصائيات الأكاديمية) ---

  async getAcademicStats(studentId: string): Promise<ServiceResponse<any>> {
    try {
      // Get Exam Submissions
      const { data: exams, error: examError } = await supabase
        .from('exam_submissions')
        .select(`
          score,
          exam:exams(title, total_marks)
        `)
        .eq('student_id', studentId);

      if (examError) {
        return { success: false, error: { message: examError.message, code: examError.code } };
      }

      // Get Homework Submissions
      const { data: homeworks, error: hwError } = await supabase
        .from('homework_submissions')
        .select(`
          grade,
          homework:homework(title)
        `)
        .eq('student_id', studentId);

      if (hwError) {
        return { success: false, error: { message: hwError.message, code: hwError.code } };
      }

      return {
        success: true,
        data: {
          exams: exams.map(e => {
            const examData = Array.isArray(e.exam) ? e.exam[0] : e.exam;
            return {
              name: examData?.title || 'Unknown',
              score: e.score,
              total: examData?.total_marks || 100,
              percentage: (e.score / (examData?.total_marks || 100)) * 100
            };
          }),
          homeworks: homeworks.map(h => {
            const hwData = Array.isArray(h.homework) ? h.homework[0] : h.homework;
            return {
              name: hwData?.title || 'Unknown',
              score: h.grade || 0,
              total: 10
            };
          })
        }
      };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  }
};
