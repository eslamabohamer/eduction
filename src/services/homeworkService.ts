// src/services/homeworkService.ts
// خدمة إدارة الواجبات المنزلية
// Service for managing homework assignments and submissions.

import { supabase } from '@/lib/supabase';
import { activityLogService } from './activityLogService';
import { ServiceResponse } from '@/types/service';

export interface Homework {
  id: string;
  title: string;
  description: string;
  classroom_id: string;
  due_date: string;
  created_at: string;
  attachment_url?: string;
  classroom?: {
    name: string;
  };
  // For student view
  submission?: HomeworkSubmission;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  content: string;
  grade?: number;
  feedback?: string;
  submitted_at: string;
  student?: {
    user: {
      name: string;
    };
    student_code: string;
  };
}

export const homeworkService = {
  async getHomeworks(): Promise<ServiceResponse<Homework[]>> {
    try {
      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          classroom:classrooms(name)
        `)
        .order('due_date', { ascending: true });

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      return { success: true, data: data as Homework[] };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  /**
   * Get homeworks for student with their submission status
   */
  async getStudentHomeworks() {
    // 1. Get homeworks available to student (RLS handles filtering)
    const { data: homeworks, error: hwError } = await supabase
      .from('homework')
      .select(`
        *,
        classroom:classrooms(name)
      `)
      .order('due_date', { ascending: true });

    if (hwError) throw hwError;

    // 2. Get student's profile ID
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!profile) return homeworks as Homework[];

    // 3. Get submissions for this student
    const { data: submissions, error: subError } = await supabase
      .from('homework_submissions')
      .select('*')
      .eq('student_id', profile.id);

    if (subError) throw subError;

    // 4. Merge data
    return homeworks.map(hw => ({
      ...hw,
      submission: submissions.find(s => s.homework_id === hw.id)
    })) as Homework[];
  },

  async createHomework(data: Omit<Homework, 'id' | 'created_at' | 'classroom'>): Promise<ServiceResponse<Homework>> {
    try {
      const { data: result, error } = await supabase
        .from('homework')
        .insert(data)
        .select()
        .single();

      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }

      // Log Activity
      await activityLogService.logAction('create_homework', 'homework', result.id, {
        title: data.title,
        due_date: data.due_date
      });

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async updateHomework(id: string, data: Partial<Homework>): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('homework')
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

  async deleteHomework(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('homework')
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

  async uploadAttachment(file: File): Promise<ServiceResponse<string>> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('homework-attachments')
        .upload(filePath, file);

      if (uploadError) {
        return { success: false, error: { message: uploadError.message } };
      }

      const { data } = supabase.storage
        .from('homework-attachments')
        .getPublicUrl(filePath);

      return { success: true, data: data.publicUrl };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  async submitHomework(homeworkId: string, content: string) {
    // Get student profile first
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!profile) throw new Error('Student profile not found');

    const { error } = await supabase
      .from('homework_submissions')
      .insert({
        homework_id: homeworkId,
        student_id: profile.id,
        content,
        // tenant_id is handled by default if RLS/Triggers are set up, 
        // or we can pass it if we have it in profile. 
        // Assuming trigger/RLS handles it or it's inferred.
      });

    if (error) throw error;
  },

  async getSubmissions(homeworkId: string) {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        student:student_profiles(
          student_code,
          user:users(name)
        )
      `)
      .eq('homework_id', homeworkId);

    if (error) throw error;
    return data as HomeworkSubmission[];
  },

  async gradeSubmission(submissionId: string, grade: number, feedback: string) {
    const { error } = await supabase
      .from('homework_submissions')
      .update({
        grade,
        feedback
      })
      .eq('id', submissionId);

    if (error) throw error;

    // Log Activity
    await activityLogService.logAction('grade_homework', 'homework_submission', submissionId, {
      grade
    });
  }
};
