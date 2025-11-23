// src/services/classroomService.ts
// تحديث خدمة الفصول لإدارة التسجيلات
// Update classroom service to manage enrollments.

import { supabase } from '@/lib/supabase';
import { StudentWithUser } from './studentService';

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
  async getClassrooms() {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*, enrollments(count)');
    
    if (error) throw error;
    
    return data.map(c => ({
      ...c,
      _count: { enrollments: c.enrollments[0]?.count || 0 }
    }));
  },

  async getClassroomById(id: string) {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Classroom;
  },

  async createClassroom(data: { name: string; level: string; grade: string }) {
    const { data: result, error } = await supabase
      .from('classrooms')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async getEnrolledStudents(classroomId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        student:student_profiles (
          *,
          user:users (*)
        )
      `)
      .eq('classroom_id', classroomId);

    if (error) throw error;
    // Flatten structure
    return data.map(item => item.student) as unknown as StudentWithUser[];
  },

  async enrollStudent(classroomId: string, studentId: string) {
    const { error } = await supabase
      .from('enrollments')
      .insert({ classroom_id: classroomId, student_id: studentId });

    if (error) {
      // Ignore duplicate key error (already enrolled)
      if (error.code === '23505') return; 
      throw error;
    }
  },

  async removeStudent(classroomId: string, studentId: string) {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('classroom_id', classroomId)
      .eq('student_id', studentId);

    if (error) throw error;
  }
};
