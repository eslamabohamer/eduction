// src/services/classroomService.ts
// تحديث خدمة الفصول لإدارة التسجيلات
// Update classroom service to manage enrollments.

import { supabase } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { StudentWithUser } from './studentService';
import { ServiceResponse } from '@/types/service';

export interface Classroom {
  id: string;
  name: string;
  level: string;
  grade: string;
  teacher_id?: string;
  tenant_id: string;
  _count?: {
    enrollments: number;
  };
}

export const classroomService = {
  async getClassrooms(): Promise<ServiceResponse<Classroom[]>> {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*, enrollments(count)');

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }

      const classrooms = data.map(c => ({
        ...c,
        _count: { enrollments: c.enrollments[0]?.count || 0 }
      }));

      return { success: true, data: classrooms };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async getClassroomById(id: string): Promise<ServiceResponse<Classroom>> {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as Classroom };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async createClassroom(data: { name: string; level: string; grade: string }): Promise<ServiceResponse<Classroom>> {
    try {
      const { data: result, error } = await supabase
        .from('classrooms')
        .insert(data)
        .select()
        .single();

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async updateClassroom(id: string, data: Partial<Classroom>): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('classrooms')
        .update(data)
        .eq('id', id);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async deleteClassroom(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async getEnrolledStudents(classroomId: string): Promise<ServiceResponse<StudentWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          student:student_profiles (
            *,
            user:users (*)
          )
        `)
        .eq('classroom_id', classroomId);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      // Flatten structure
      const students = data.map(item => item.student) as unknown as StudentWithUser[];
      return { success: true, data: students };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async enrollStudent(classroomId: string, studentId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({ classroom_id: classroomId, student_id: studentId });

      if (error) {
        // Ignore duplicate key error (already enrolled)
        if (error.code === '23505') return { success: true };
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async removeStudent(classroomId: string, studentId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId);

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  }
};
