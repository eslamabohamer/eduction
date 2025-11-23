// src/services/studentService.ts
// خدمة إدارة الطلاب
// Handles student fetching and creation operations.

import { supabase } from '@/lib/supabase';
import { StudentProfile, User } from '@/types';

export interface StudentWithUser extends StudentProfile {
  user: User;
}

export const studentService = {
  /**
   * Fetch all students for the current tenant
   */
  async getStudents() {
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`
        *,
        user:users(*)
      `);
    
    if (error) throw error;
    return data as StudentWithUser[];
  },

  /**
   * Create a new student record
   */
  async createStudent(data: {
    name: string;
    username: string;
    grade: string;
    level: string;
    dateOfBirth?: Date;
  }) {
    const { data: result, error } = await supabase.rpc('create_student_record', {
      p_name: data.name,
      p_username: data.username,
      p_grade: data.grade,
      p_level: data.level,
      p_dob: data.dateOfBirth ? data.dateOfBirth.toISOString() : null
    });

    if (error) throw error;
    return result;
  },

  /**
   * Find student by code (for barcode scanner)
   */
  async getStudentByCode(code: string) {
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`
        *,
        user:users(*)
      `)
      .eq('student_code', code)
      .single();
      
    if (error) throw error;
    return data as StudentWithUser;
  }
};
